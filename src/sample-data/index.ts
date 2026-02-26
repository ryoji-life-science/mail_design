import { JournalEntry, AnnualBudget, MonthlyBudgetItem } from '../types';
import { StaffAllocationInput } from '../types/management-report';

/**
 * サンプルデータ生成
 *
 * 4事業部体制:
 *   - 人材育成事業
 *   - 出版事業
 *   - 地域づくり事業
 *   - その他の事業
 *
 * 期: 18期（2025年10月〜2026年9月）
 * 前期: 17期（2024年10月〜2025年9月）
 */

export const DEPARTMENTS = [
  { code: 'JINZAI', name: '人材育成事業', displayOrder: 1 },
  { code: 'SHUPPAN', name: '出版事業', displayOrder: 2 },
  { code: 'CHIIKI', name: '地域づくり事業', displayOrder: 3 },
  { code: 'SONOTA', name: 'その他の事業', displayOrder: 4 },
];

export const DEPARTMENT_NAMES = DEPARTMENTS.map(d => d.name);
export const DEPARTMENT_CODES = DEPARTMENTS.map(d => d.code);

/** 仕訳を簡易生成するヘルパー */
function makeEntry(
  date: string,
  accountCode: string,
  accountName: string,
  debit: number,
  credit: number,
  departmentName?: string,
  description?: string
): JournalEntry {
  return { date, accountCode, accountName, debit, credit, departmentName, description };
}

/** 月ごとの売上仕訳を生成（売掛金/売上高） */
function revenueEntries(yearMonth: string, dept: string, amount: number): JournalEntry[] {
  const date = `${yearMonth}-28`;
  return [
    makeEntry(date, '1200', '売掛金', amount, 0, dept, `${dept}売上`),
    makeEntry(date, '4100', '売上高', 0, amount, dept, `${dept}売上`),
  ];
}

/** 月ごとの費用仕訳を生成 */
function expenseEntries(
  yearMonth: string,
  accountCode: string,
  accountName: string,
  amount: number,
  dept?: string
): JournalEntry[] {
  const date = `${yearMonth}-28`;
  return [
    makeEntry(date, accountCode, accountName, amount, 0, dept, `${accountName}`),
    makeEntry(date, '1101', '普通預金', 0, amount, undefined, `${accountName}支払`),
  ];
}

/**
 * 18期（当期）サンプル仕訳データ
 * 2025-10 〜 2026-09
 */
export function generate18thPeriodEntries(): JournalEntry[] {
  const entries: JournalEntry[] = [];

  // 期首残高（開始仕訳）
  entries.push(makeEntry('2025-10-01', '1101', '普通預金', 30000000, 0, undefined, '期首残高'));
  entries.push(makeEntry('2025-10-01', '1200', '売掛金', 5000000, 0, undefined, '期首残高'));
  entries.push(makeEntry('2025-10-01', '1730', '工具器具備品', 3000000, 0, undefined, '期首残高'));
  entries.push(makeEntry('2025-10-01', '1750', 'ソフトウェア', 2000000, 0, undefined, '期首残高'));
  entries.push(makeEntry('2025-10-01', '1780', '敷金・保証金', 1500000, 0, undefined, '期首残高'));
  entries.push(makeEntry('2025-10-01', '3100', '資本金', 0, 10000000, undefined, '期首残高'));
  entries.push(makeEntry('2025-10-01', '3301', '繰越利益剰余金', 0, 31500000, undefined, '期首残高'));

  // 月次データ（1Q: 10,11,12 → 2Q: 1,2,3 → 3Q: 4,5,6 → 4Q: 7,8,9）
  const monthlyRevenue: Record<string, Record<string, number>> = {
    '2025-10': { '人材育成事業': 6200000, '出版事業': 510000, '地域づくり事業': 1850000, 'その他の事業': 100000 },
    '2025-11': { '人材育成事業': 6400000, '出版事業': 505000, '地域づくり事業': 1870000, 'その他の事業': 110000 },
    '2025-12': { '人材育成事業': 6342000, '出版事業': 506000, '地域づくり事業': 1891000, 'その他の事業': 105000 },
    '2026-01': { '人材育成事業': 5800000, '出版事業': 520000, '地域づくり事業': 1750000, 'その他の事業': 90000 },
    '2026-02': { '人材育成事業': 6100000, '出版事業': 515000, '地域づくり事業': 1820000, 'その他の事業': 95000 },
    '2026-03': { '人材育成事業': 6300000, '出版事業': 530000, '地域づくり事業': 1900000, 'その他の事業': 120000 },
    '2026-04': { '人材育成事業': 5500000, '出版事業': 490000, '地域づくり事業': 2100000, 'その他の事業': 80000 },
    '2026-05': { '人材育成事業': 5800000, '出版事業': 500000, '地域づくり事業': 2200000, 'その他の事業': 85000 },
    '2026-06': { '人材育成事業': 5700000, '出版事業': 510000, '地域づくり事業': 2150000, 'その他の事業': 90000 },
    '2026-07': { '人材育成事業': 4800000, '出版事業': 480000, '地域づくり事業': 1600000, 'その他の事業': 75000 },
    '2026-08': { '人材育成事業': 4500000, '出版事業': 470000, '地域づくり事業': 1500000, 'その他の事業': 70000 },
    '2026-09': { '人材育成事業': 5200000, '出版事業': 500000, '地域づくり事業': 1800000, 'その他の事業': 100000 },
  };

  // 売上仕訳
  for (const [ym, depts] of Object.entries(monthlyRevenue)) {
    for (const [dept, amount] of Object.entries(depts)) {
      entries.push(...revenueEntries(ym, dept, amount));
    }
  }

  // 売上原価（月次、外注費中心）
  const monthlyCOS: Record<string, number> = {
    '2025-10': 2050000, '2025-11': 2100000, '2025-12': 2080000,
    '2026-01': 1950000, '2026-02': 2000000, '2026-03': 2100000,
    '2026-04': 1900000, '2026-05': 1950000, '2026-06': 1980000,
    '2026-07': 1700000, '2026-08': 1650000, '2026-09': 1850000,
  };

  for (const [ym, amount] of Object.entries(monthlyCOS)) {
    entries.push(...expenseEntries(ym, '5101', '外注費', amount));
  }

  // 販管費（月次）
  const monthlyExpenses = [
    { code: '6100', name: '役員報酬', amount: 800000 },
    { code: '6101', name: '給料手当', amount: 2500000 },
    { code: '6104', name: '法定福利費', amount: 450000 },
    { code: '6125', name: '地代家賃', amount: 350000 },
    { code: '6120', name: '旅費交通費', amount: 180000 },
    { code: '6121', name: '通信費', amount: 80000 },
    { code: '6130', name: '支払手数料', amount: 120000 },
    { code: '6136', name: '業務委託費', amount: 200000 },
    { code: '6129', name: '減価償却費', amount: 100000 },
    { code: '6199', name: '雑費', amount: 50000 },
  ];

  const allMonths = Object.keys(monthlyRevenue);
  for (const ym of allMonths) {
    for (const exp of monthlyExpenses) {
      // 月ごとに少しバラつきを持たせる
      const monthNum = parseInt(ym.split('-')[1]);
      const variation = 1 + (monthNum % 3 - 1) * 0.05;
      entries.push(...expenseEntries(ym, exp.code, exp.name, Math.round(exp.amount * variation)));
    }
  }

  // 営業外収益・費用
  for (const ym of allMonths) {
    entries.push(...[
      makeEntry(`${ym}-28`, '1101', '普通預金', 500, 0, undefined, '受取利息'),
      makeEntry(`${ym}-28`, '7100', '受取利息', 0, 500, undefined, '受取利息'),
    ]);
  }

  // 売掛金回収（前月分を翌月回収）
  for (let i = 1; i < allMonths.length; i++) {
    const ym = allMonths[i];
    const prevRevenue = Object.values(monthlyRevenue[allMonths[i - 1]]).reduce((a, b) => a + b, 0);
    entries.push(makeEntry(`${ym}-15`, '1101', '普通預金', prevRevenue, 0, undefined, '売掛金回収'));
    entries.push(makeEntry(`${ym}-15`, '1200', '売掛金', 0, prevRevenue, undefined, '売掛金回収'));
  }

  return entries;
}

/**
 * 17期（前期）サンプル仕訳データ
 * 2024-10 〜 2025-09
 */
export function generate17thPeriodEntries(): JournalEntry[] {
  const entries: JournalEntry[] = [];

  const monthlyRevenue: Record<string, Record<string, number>> = {
    '2024-10': { '人材育成事業': 5800000, '出版事業': 480000, '地域づくり事業': 1700000, 'その他の事業': 0 },
    '2024-11': { '人材育成事業': 6000000, '出版事業': 490000, '地域づくり事業': 1720000, 'その他の事業': 0 },
    '2024-12': { '人材育成事業': 5900000, '出版事業': 485000, '地域づくり事業': 1680000, 'その他の事業': 0 },
    '2025-01': { '人材育成事業': 5500000, '出版事業': 500000, '地域づくり事業': 1600000, 'その他の事業': 0 },
    '2025-02': { '人材育成事業': 5700000, '出版事業': 495000, '地域づくり事業': 1650000, 'その他の事業': 0 },
    '2025-03': { '人材育成事業': 5900000, '出版事業': 510000, '地域づくり事業': 1750000, 'その他の事業': 0 },
    '2025-04': { '人材育成事業': 5200000, '出版事業': 470000, '地域づくり事業': 1900000, 'その他の事業': 0 },
    '2025-05': { '人材育成事業': 5400000, '出版事業': 480000, '地域づくり事業': 2000000, 'その他の事業': 0 },
    '2025-06': { '人材育成事業': 5300000, '出版事業': 490000, '地域づくり事業': 1950000, 'その他の事業': 0 },
    '2025-07': { '人材育成事業': 4500000, '出版事業': 460000, '地域づくり事業': 1500000, 'その他の事業': 0 },
    '2025-08': { '人材育成事業': 4200000, '出版事業': 450000, '地域づくり事業': 1400000, 'その他の事業': 0 },
    '2025-09': { '人材育成事業': 4800000, '出版事業': 480000, '地域づくり事業': 1600000, 'その他の事業': 0 },
  };

  for (const [ym, depts] of Object.entries(monthlyRevenue)) {
    for (const [dept, amount] of Object.entries(depts)) {
      if (amount > 0) {
        entries.push(...revenueEntries(ym, dept, amount));
      }
    }
  }

  // 前期の売上原価
  const allMonths = Object.keys(monthlyRevenue);
  for (const ym of allMonths) {
    entries.push(...expenseEntries(ym, '5101', '外注費', 1800000));
  }

  // 前期の販管費
  const monthlyExpenses = [
    { code: '6100', name: '役員報酬', amount: 750000 },
    { code: '6101', name: '給料手当', amount: 2300000 },
    { code: '6104', name: '法定福利費', amount: 420000 },
    { code: '6125', name: '地代家賃', amount: 330000 },
    { code: '6120', name: '旅費交通費', amount: 160000 },
    { code: '6121', name: '通信費', amount: 75000 },
    { code: '6130', name: '支払手数料', amount: 110000 },
    { code: '6136', name: '業務委託費', amount: 180000 },
    { code: '6129', name: '減価償却費', amount: 100000 },
    { code: '6199', name: '雑費', amount: 45000 },
  ];

  for (const ym of allMonths) {
    for (const exp of monthlyExpenses) {
      entries.push(...expenseEntries(ym, exp.code, exp.name, exp.amount));
    }
  }

  return entries;
}

/**
 * 18期 年次予算
 */
export function generate18thBudget(): AnnualBudget {
  const months = [
    '2025-10', '2025-11', '2025-12',
    '2026-01', '2026-02', '2026-03',
    '2026-04', '2026-05', '2026-06',
    '2026-07', '2026-08', '2026-09',
  ];

  // 売上予算（万円単位で入力、loadAnnualBudgetでは万円→円変換するが、ここでは円で直接指定）
  const revenueBudget: MonthlyBudgetItem[] = [];
  const deptBudgets: Record<string, number[]> = {
    JINZAI: [6000000, 6200000, 6100000, 5700000, 5900000, 6100000, 5400000, 5600000, 5500000, 4700000, 4400000, 5000000],
    SHUPPAN: [500000, 500000, 500000, 510000, 510000, 520000, 480000, 490000, 500000, 470000, 460000, 490000],
    CHIIKI: [1800000, 1850000, 1830000, 1700000, 1780000, 1850000, 2050000, 2150000, 2100000, 1550000, 1450000, 1750000],
    SONOTA: [50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000],
  };

  for (const [deptCode, values] of Object.entries(deptBudgets)) {
    values.forEach((amount, i) => {
      revenueBudget.push({
        yearMonth: months[i],
        accountCode: '4100',
        accountName: '売上高',
        departmentCode: deptCode,
        amount,
      });
    });
  }

  // 売上原価予算
  const cosBudgetAmounts = [1950000, 2000000, 1980000, 1900000, 1950000, 2000000, 1850000, 1900000, 1920000, 1650000, 1600000, 1800000];
  const costOfSalesBudget: MonthlyBudgetItem[] = cosBudgetAmounts.map((amount, i) => ({
    yearMonth: months[i],
    accountCode: '5101',
    accountName: '外注費',
    amount,
  }));

  // 販管費予算
  const sgaMonthly = 4830000; // 月額固定
  const sgaBudget: MonthlyBudgetItem[] = months.map(ym => ({
    yearMonth: ym,
    accountCode: '6000',
    accountName: '販管費合計',
    amount: sgaMonthly,
  }));

  return {
    fiscalYear: 18,
    fiscalYearStart: '2025-10',
    fiscalYearEnd: '2026-09',
    revenueBudget,
    costOfSalesBudget,
    sgaBudget,
  };
}

/**
 * 人員稼働割合（2Qの例）
 */
export function generateStaffAllocation2Q(): StaffAllocationInput {
  return {
    quarter: '2Q',
    yearMonth: '2026-01',
    members: [
      {
        name: '岡部',
        monthlyCost: 600000,
        allocation: { '人材育成事業': 35, '出版事業': 10, '地域づくり事業': 5, 'その他の事業': 30, '本社費': 20 },
      },
      {
        name: '長島',
        monthlyCost: 500000,
        allocation: { '人材育成事業': 45, '出版事業': 65, '地域づくり事業': 0, 'その他の事業': 0, '本社費': 0 },
      },
      {
        name: '萩原',
        monthlyCost: 450000,
        allocation: { '人材育成事業': 5, '出版事業': 10, '地域づくり事業': 80, 'その他の事業': 0, '本社費': 5 },
      },
      {
        name: '吉村',
        monthlyCost: 450000,
        allocation: { '人材育成事業': 0, '出版事業': 0, '地域づくり事業': 15, 'その他の事業': 70, '本社費': 15 },
      },
      {
        name: '岡本',
        monthlyCost: 400000,
        allocation: { '人材育成事業': 0, '出版事業': 0, '地域づくり事業': 0, 'その他の事業': 5, '本社費': 95 },
      },
      {
        name: '三重野',
        monthlyCost: 350000,
        allocation: { '人材育成事業': 0, '出版事業': 0, '地域づくり事業': 0, 'その他の事業': 5, '本社費': 95 },
      },
    ],
  };
}

export function generateStaffAllocation1Q(): StaffAllocationInput {
  return {
    quarter: '1Q',
    yearMonth: '2025-10',
    members: [
      {
        name: '岡部',
        monthlyCost: 600000,
        allocation: { '人材育成事業': 20, '出版事業': 5, '地域づくり事業': 0, 'その他の事業': 35, '本社費': 40 },
      },
      {
        name: '長島',
        monthlyCost: 500000,
        allocation: { '人材育成事業': 40, '出版事業': 50, '地域づくり事業': 0, 'その他の事業': 0, '本社費': 10 },
      },
      {
        name: '萩原',
        monthlyCost: 450000,
        allocation: { '人材育成事業': 0, '出版事業': 20, '地域づくり事業': 90, 'その他の事業': 0, '本社費': 0 },
      },
      {
        name: '吉村',
        monthlyCost: 450000,
        allocation: { '人材育成事業': 0, '出版事業': 0, '地域づくり事業': 10, 'その他の事業': 0, '本社費': 25 },
      },
      {
        name: '岡本',
        monthlyCost: 400000,
        allocation: { '人材育成事業': 0, '出版事業': 0, '地域づくり事業': 0, 'その他の事業': 0, '本社費': 95 },
      },
      {
        name: '三重野',
        monthlyCost: 350000,
        allocation: { '人材育成事業': 0, '出版事業': 5, '地域づくり事業': 0, 'その他の事業': 0, '本社費': 95 },
      },
    ],
  };
}
