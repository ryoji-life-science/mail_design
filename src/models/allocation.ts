import * as fs from 'fs';
import {
  StaffAllocation,
  AllocationRule,
  Department,
  JournalEntry,
  DepartmentPL,
  PLLineItem,
} from '../types';
import { findAccountByCode } from '../utils/accounts';
import { toYearMonth } from '../utils/date';

/**
 * 人員稼働割合の設定ファイルを読み込む
 *
 * JSON形式の設定ファイル例:
 * {
 *   "yearMonth": "2026-01",
 *   "allocations": [
 *     {
 *       "staffName": "田中太郎",
 *       "monthlyCost": 500000,
 *       "departments": { "DEPT01": 60, "DEPT02": 40 }
 *     }
 *   ]
 * }
 */
export function loadStaffAllocations(filePath: string): StaffAllocation[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  if (Array.isArray(data)) {
    // 複数月分の配列
    return data.flatMap(parseAllocationMonth);
  }
  // 単月分
  return parseAllocationMonth(data);
}

function parseAllocationMonth(data: {
  yearMonth: string;
  allocations: {
    staffName: string;
    monthlyCost: number;
    departments: Record<string, number>;
  }[];
}): StaffAllocation[] {
  return data.allocations.map(a => ({
    yearMonth: data.yearMonth,
    staffName: a.staffName,
    monthlyCost: a.monthlyCost,
    departmentAllocations: Object.entries(a.departments).map(([code, pct]) => ({
      departmentCode: code,
      percentage: pct,
    })),
  }));
}

/**
 * 部門別の人件費配賦を計算
 */
export function calculateLaborAllocation(
  allocations: StaffAllocation[],
  yearMonth: string
): Map<string, number> {
  const result = new Map<string, number>();

  const monthAllocations = allocations.filter(a => a.yearMonth === yearMonth);

  for (const allocation of monthAllocations) {
    for (const dept of allocation.departmentAllocations) {
      const amount = allocation.monthlyCost * (dept.percentage / 100);
      const current = result.get(dept.departmentCode) ?? 0;
      result.set(dept.departmentCode, current + amount);
    }
  }

  return result;
}

/**
 * 仕訳データから部門別損益を集計
 */
export function calculateDepartmentPL(
  entries: JournalEntry[],
  departments: Department[],
  allocations: StaffAllocation[],
  allocationRules: AllocationRule[],
  yearMonth: string,
  accounts = require('../utils/accounts').DEFAULT_ACCOUNTS
): DepartmentPL[] {
  // 当月の仕訳を抽出
  const monthEntries = entries.filter(e => toYearMonth(e.date) === yearMonth);

  // 部門直課の経費を集計
  const directByDept = new Map<string, Map<string, number>>();
  const revenueByDept = new Map<string, number>();

  for (const dept of departments) {
    directByDept.set(dept.code, new Map());
    revenueByDept.set(dept.code, 0);
  }

  for (const entry of monthEntries) {
    if (!entry.departmentName) continue;

    const dept = departments.find(d => d.name === entry.departmentName || d.code === entry.departmentName);
    if (!dept) continue;

    const account = findAccountByCode(entry.accountCode, accounts);
    if (!account) continue;

    const netAmount = entry.debit - entry.credit;

    if (account.category === 'revenue') {
      // 売上は貸方がプラス
      const current = revenueByDept.get(dept.code) ?? 0;
      revenueByDept.set(dept.code, current + entry.credit - entry.debit);
    } else if (
      account.category === 'cost_of_sales' ||
      account.category === 'sga_expenses'
    ) {
      const deptMap = directByDept.get(dept.code)!;
      const current = deptMap.get(entry.accountCode) ?? 0;
      deptMap.set(entry.accountCode, current + netAmount);
    }
  }

  // 人件費配賦
  const laborAllocation = calculateLaborAllocation(allocations, yearMonth);

  // 共通経費の配賦
  const commonExpenses = new Map<string, number>();
  for (const entry of monthEntries) {
    if (entry.departmentName) continue; // 部門がある仕訳はスキップ

    const account = findAccountByCode(entry.accountCode, accounts);
    if (!account) continue;

    if (account.category === 'sga_expenses') {
      const current = commonExpenses.get(entry.accountCode) ?? 0;
      commonExpenses.set(entry.accountCode, current + (entry.debit - entry.credit));
    }
  }

  // 配賦ルールに基づく共通経費の配分
  const allocatedByDept = new Map<string, number>();
  for (const dept of departments) {
    allocatedByDept.set(dept.code, 0);
  }

  const totalRevenue = Array.from(revenueByDept.values()).reduce((a, b) => a + b, 0);

  for (const [accountCode, amount] of commonExpenses) {
    const rule = allocationRules.find(r => r.expenseAccountCode === accountCode);
    const method = rule?.method ?? 'headcount';

    for (const dept of departments) {
      let ratio: number;

      if (method === 'manual' && rule?.manualRatios) {
        const manualRatio = rule.manualRatios.find(r => r.departmentCode === dept.code);
        ratio = manualRatio?.ratio ?? 0;
      } else if (method === 'revenue' && totalRevenue > 0) {
        ratio = (revenueByDept.get(dept.code) ?? 0) / totalRevenue;
      } else {
        // headcount（デフォルト）: 人員稼働割合ベース
        const totalLabor = Array.from(laborAllocation.values()).reduce((a, b) => a + b, 0);
        const deptLabor = laborAllocation.get(dept.code) ?? 0;
        ratio = totalLabor > 0 ? deptLabor / totalLabor : 1 / departments.length;
      }

      const allocated = amount * ratio;
      const current = allocatedByDept.get(dept.code) ?? 0;
      allocatedByDept.set(dept.code, current + allocated);
    }
  }

  // 部門別P/L作成
  return departments.map(dept => {
    const revenue = revenueByDept.get(dept.code) ?? 0;
    const directMap = directByDept.get(dept.code) ?? new Map();

    let costOfSales = 0;
    let directExpenses = 0;
    const details: PLLineItem[] = [];

    for (const [accountCode, amount] of directMap) {
      const account = findAccountByCode(accountCode, accounts);
      if (!account) continue;

      details.push({
        accountCode,
        accountName: account.name,
        amount,
      });

      if (account.category === 'cost_of_sales') {
        costOfSales += amount;
      } else {
        directExpenses += amount;
      }
    }

    // 人件費配賦を直接経費に加算
    const laborCost = laborAllocation.get(dept.code) ?? 0;
    directExpenses += laborCost;
    if (laborCost > 0) {
      details.push({
        accountCode: '6101',
        accountName: '人件費（配賦）',
        amount: laborCost,
      });
    }

    const grossProfit = revenue - costOfSales;
    const allocatedExpenses = allocatedByDept.get(dept.code) ?? 0;
    const departmentProfit = grossProfit - directExpenses - allocatedExpenses;

    return {
      yearMonth,
      departmentCode: dept.code,
      departmentName: dept.name,
      revenue,
      costOfSales,
      grossProfit,
      directExpenses,
      allocatedExpenses,
      departmentProfit,
      details,
    };
  });
}
