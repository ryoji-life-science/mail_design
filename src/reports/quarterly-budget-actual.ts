import {
  QuarterlyBudgetActualReport,
  BudgetActualRow,
  Quarter,
  PeriodBudgetActualReport,
  PeriodComparisonRow,
  AnnualForecastChart,
} from '../types/management-report';
import { JournalEntry, AnnualBudget, AccountMaster } from '../types';
import { DEFAULT_ACCOUNTS, findAccountByCode } from '../utils/accounts';
import { toYearMonth, getMonthRange } from '../utils/date';

/** 四半期の月範囲を取得（4月始まり前提） */
export function getQuarterMonths(fiscalYearStart: string, quarter: Quarter): string[] {
  const startMonth = fiscalYearStart; // e.g. "2025-10"
  const offset: Record<Quarter, number> = { '1Q': 0, '2Q': 3, '3Q': 6, '4Q': 9 };
  const [y, m] = startMonth.split('-').map(Number);

  const months: string[] = [];
  for (let i = 0; i < 3; i++) {
    let month = m + offset[quarter] + i;
    let year = y;
    while (month > 12) {
      month -= 12;
      year += 1;
    }
    months.push(`${year}-${String(month).padStart(2, '0')}`);
  }
  return months;
}

/** 仕訳から指定月範囲・部門の売上高を集計 */
function sumRevenue(
  entries: JournalEntry[],
  months: string[],
  departmentName?: string,
  accounts: AccountMaster[] = DEFAULT_ACCOUNTS
): number {
  let total = 0;
  for (const entry of entries) {
    const ym = toYearMonth(entry.date);
    if (!months.includes(ym)) continue;

    const account = findAccountByCode(entry.accountCode, accounts);
    if (account?.category !== 'revenue') continue;

    if (departmentName && entry.departmentName !== departmentName) continue;

    total += entry.credit - entry.debit;
  }
  return total;
}

/** 仕訳から指定月範囲のカテゴリ別合計を集計 */
function sumByCategory(
  entries: JournalEntry[],
  months: string[],
  category: string,
  accounts: AccountMaster[] = DEFAULT_ACCOUNTS
): number {
  let total = 0;
  for (const entry of entries) {
    const ym = toYearMonth(entry.date);
    if (!months.includes(ym)) continue;

    const account = findAccountByCode(entry.accountCode, accounts);
    if (account?.category !== category) continue;

    if (
      category === 'revenue' ||
      category === 'non_operating_income' ||
      category === 'extraordinary_income'
    ) {
      total += entry.credit - entry.debit;
    } else {
      total += entry.debit - entry.credit;
    }
  }
  return total;
}

/** 予算から指定月範囲・カテゴリの合計を取得 */
function sumBudgetByCategory(
  budget: AnnualBudget,
  months: string[],
  category: 'revenue' | 'cost_of_sales' | 'sga_expenses',
  departmentCode?: string
): number {
  const items = category === 'revenue'
    ? budget.revenueBudget
    : category === 'cost_of_sales'
      ? budget.costOfSalesBudget
      : budget.sgaBudget;

  return items
    .filter(item => {
      if (!months.includes(item.yearMonth)) return false;
      if (departmentCode && item.departmentCode !== departmentCode) return false;
      return true;
    })
    .reduce((sum, item) => sum + item.amount, 0);
}

function makeBudgetActualRow(
  label: string,
  budget: number,
  actual: number,
  options?: { isHighlight?: boolean; isBold?: boolean; isRate?: boolean }
): BudgetActualRow {
  const variance = actual - budget;
  const varianceRate = budget !== 0 ? Math.round((variance / budget) * 100) : 0;
  return {
    label,
    budget,
    actual,
    variance,
    varianceRate,
    ...options,
  };
}

function makeRateRow(
  label: string,
  budgetRate: number,
  actualRate: number
): BudgetActualRow {
  return {
    label,
    budget: budgetRate,
    actual: actualRate,
    variance: actualRate - budgetRate,
    varianceRate: 0,
    isRate: true,
  };
}

/**
 * 四半期予実レポートを生成
 */
export function generateQuarterlyReport(
  entries: JournalEntry[],
  budget: AnnualBudget,
  quarter: Quarter,
  departmentNames: string[],
  departmentCodes: string[],
  periodLabel: string,
  accounts: AccountMaster[] = DEFAULT_ACCOUNTS
): QuarterlyBudgetActualReport {
  const months = getQuarterMonths(budget.fiscalYearStart, quarter);

  // 売上高
  const revenueBudget = sumBudgetByCategory(budget, months, 'revenue');
  const revenueActual = sumRevenue(entries, months, undefined, accounts);

  // 事業部別売上
  const deptRevenue = departmentNames.map((name, i) => {
    const bgt = sumBudgetByCategory(budget, months, 'revenue', departmentCodes[i]);
    const act = sumRevenue(entries, months, name, accounts);
    return makeBudgetActualRow(name, bgt, act);
  });

  // 売上原価
  const cosBudget = sumBudgetByCategory(budget, months, 'cost_of_sales');
  const cosActual = sumByCategory(entries, months, 'cost_of_sales', accounts);

  // 売上総利益
  const gpBudget = revenueBudget - cosBudget;
  const gpActual = revenueActual - cosActual;

  // 売上総利益率
  const gpRateBudget = revenueBudget !== 0 ? Math.round((gpBudget / revenueBudget) * 100) : 0;
  const gpRateActual = revenueActual !== 0 ? Math.round((gpActual / revenueActual) * 100) : 0;

  // 販管費
  const sgaBudget = sumBudgetByCategory(budget, months, 'sga_expenses');
  const sgaActual = sumByCategory(entries, months, 'sga_expenses', accounts);

  // 営業利益
  const opBudget = gpBudget - sgaBudget;
  const opActual = gpActual - sgaActual;

  // 営業利益率
  const opRateBudget = revenueBudget !== 0 ? Math.round((opBudget / revenueBudget) * 100) : 0;
  const opRateActual = revenueActual !== 0 ? Math.round((opActual / revenueActual) * 100) : 0;

  // 営業外収支
  const noIncome = sumByCategory(entries, months, 'non_operating_income', accounts);
  const noExpense = sumByCategory(entries, months, 'non_operating_expense', accounts);

  // 経常利益
  const ordBudget = opBudget; // 予算に営業外を含めない簡略化
  const ordActual = opActual + noIncome - noExpense;

  const revenueVarianceRate = revenueBudget !== 0
    ? Math.round(((revenueActual - revenueBudget) / revenueBudget) * 100)
    : 0;
  const opVarianceRate = opBudget !== 0
    ? Math.round(((opActual - opBudget) / opBudget) * 100)
    : 0;

  const title = `${quarter}単体の売上は対予算比 ${revenueVarianceRate}%${revenueVarianceRate >= 0 ? '増' : '減'}、営業利益は対予算比 ${opVarianceRate}%${opVarianceRate >= 0 ? '増' : '減'}`;

  return {
    period: periodLabel,
    quarter,
    title,
    sections: {
      revenue: {
        total: makeBudgetActualRow('売上高合計', revenueBudget, revenueActual),
        byDepartment: deptRevenue,
      },
      costOfSales: makeBudgetActualRow('売上原価', cosBudget, cosActual),
      grossMarginRate: makeRateRow('売上総利益率', gpRateBudget, gpRateActual),
      grossProfit: makeBudgetActualRow('売上総利益', gpBudget, gpActual),
      sgaExpenses: makeBudgetActualRow('販売管理費計', sgaBudget, sgaActual, { isHighlight: true }),
      operatingProfit: makeBudgetActualRow('営業利益', opBudget, opActual, { isBold: true, isHighlight: true }),
      operatingMarginRate: makeRateRow('営業利益率', opRateBudget, opRateActual),
      ordinaryProfit: makeBudgetActualRow('経常利益', ordBudget, ordActual, { isBold: true }),
    },
  };
}

/**
 * 上半期/通期予実レポートを生成
 */
export function generatePeriodReport(
  currentEntries: JournalEntry[],
  previousEntries: JournalEntry[],
  budget: AnnualBudget,
  quarters: Quarter[],
  departmentNames: string[],
  departmentCodes: string[],
  periodLabel: string,
  forecastEntries?: JournalEntry[],
  accounts: AccountMaster[] = DEFAULT_ACCOUNTS
): PeriodBudgetActualReport {
  const allMonths: string[] = [];
  for (const q of quarters) {
    allMonths.push(...getQuarterMonths(budget.fiscalYearStart, q));
  }

  // 前期の同期間月を計算
  const prevMonths = allMonths.map(m => {
    const [y, mo] = m.split('-').map(Number);
    return `${y - 1}-${String(mo).padStart(2, '0')}`;
  });

  const actualEntries = forecastEntries
    ? [...currentEntries, ...forecastEntries]
    : currentEntries;

  const makeRow = (
    label: string,
    category: string,
    deptName?: string,
    deptCode?: string
  ): PeriodComparisonRow => {
    const prev = category === 'revenue' && deptName
      ? sumRevenue(previousEntries, prevMonths, deptName, accounts)
      : sumByCategory(previousEntries, prevMonths, category, accounts);

    const bgt = category === 'revenue'
      ? sumBudgetByCategory(budget, allMonths, 'revenue', deptCode)
      : category === 'cost_of_sales'
        ? sumBudgetByCategory(budget, allMonths, 'cost_of_sales')
        : sumBudgetByCategory(budget, allMonths, 'sga_expenses');

    const act = category === 'revenue' && deptName
      ? sumRevenue(actualEntries, allMonths, deptName, accounts)
      : sumByCategory(actualEntries, allMonths, category, accounts);

    return {
      label,
      previousYear: prev,
      budget: bgt,
      actual: act,
      yoyVariance: act - prev,
      yoyVarianceRate: prev !== 0 ? Math.round(((act - prev) / prev) * 100) : 0,
      budgetVariance: act - bgt,
      budgetVarianceRate: bgt !== 0 ? Math.round(((act - bgt) / bgt) * 100) : 0,
    };
  };

  // 売上
  const revTotal = makeRow('売上高合計', 'revenue');
  const deptRevenues = departmentNames.map((name, i) =>
    makeRow(name, 'revenue', name, departmentCodes[i])
  );

  // 原価
  const cos = makeRow('売上原価', 'cost_of_sales');

  // 売上総利益
  const gpPrev = revTotal.previousYear - cos.previousYear;
  const gpBgt = revTotal.budget - cos.budget;
  const gpAct = revTotal.actual - cos.actual;

  // 率
  const gpRatePrev = revTotal.previousYear !== 0 ? Math.round((gpPrev / revTotal.previousYear) * 100) : 0;
  const gpRateBgt = revTotal.budget !== 0 ? Math.round((gpBgt / revTotal.budget) * 100) : 0;
  const gpRateAct = revTotal.actual !== 0 ? Math.round((gpAct / revTotal.actual) * 100) : 0;

  // 販管費
  const sga = makeRow('販売管理費計', 'sga_expenses');

  // 営業利益
  const opPrev = gpPrev - sga.previousYear;
  const opBgt = gpBgt - sga.budget;
  const opAct = gpAct - sga.actual;

  // 営業利益率
  const opRatePrev = revTotal.previousYear !== 0 ? Math.round((opPrev / revTotal.previousYear) * 100) : 0;
  const opRateBgt = revTotal.budget !== 0 ? Math.round((opBgt / revTotal.budget) * 100) : 0;
  const opRateAct = revTotal.actual !== 0 ? Math.round((opAct / revTotal.actual) * 100) : 0;

  // 経常利益
  const noIncomeCur = sumByCategory(actualEntries, allMonths, 'non_operating_income', accounts);
  const noExpenseCur = sumByCategory(actualEntries, allMonths, 'non_operating_expense', accounts);
  const noIncomePrev = sumByCategory(previousEntries, prevMonths, 'non_operating_income', accounts);
  const noExpensePrev = sumByCategory(previousEntries, prevMonths, 'non_operating_expense', accounts);

  const ordPrev = opPrev + noIncomePrev - noExpensePrev;
  const ordBgt = opBgt;
  const ordAct = opAct + noIncomeCur - noExpenseCur;

  const revVarianceRate = revTotal.budgetVarianceRate ?? 0;
  const opVarianceRate = opBgt !== 0 ? Math.round(((opAct - opBgt) / opBgt) * 100) : 0;
  const ordVarianceRate = ordBgt !== 0 ? Math.round(((ordAct - ordBgt) / ordBgt) * 100) : 0;

  return {
    period: periodLabel,
    title: periodLabel,
    commentBullets: [
      `対予算比 売上${revVarianceRate}%${revVarianceRate >= 0 ? '増' : '減'}、営業利益${opVarianceRate}%${opVarianceRate >= 0 ? '増' : '減'}、経常利益${ordVarianceRate}%${ordVarianceRate >= 0 ? '増' : '減'}`,
    ],
    sections: {
      revenue: {
        total: revTotal,
        byDepartment: deptRevenues,
      },
      costOfSales: cos,
      grossMarginRate: {
        label: '売上総利益率',
        previousYear: gpRatePrev,
        budget: gpRateBgt,
        actual: gpRateAct,
        isRate: true,
      },
      grossProfit: {
        label: '売上総利益',
        previousYear: gpPrev,
        budget: gpBgt,
        actual: gpAct,
        yoyVariance: gpAct - gpPrev,
        yoyVarianceRate: gpPrev !== 0 ? Math.round(((gpAct - gpPrev) / gpPrev) * 100) : 0,
        budgetVariance: gpAct - gpBgt,
        budgetVarianceRate: gpBgt !== 0 ? Math.round(((gpAct - gpBgt) / gpBgt) * 100) : 0,
      },
      sgaExpenses: sga,
      operatingProfit: {
        label: '営業利益',
        previousYear: opPrev,
        budget: opBgt,
        actual: opAct,
        yoyVariance: opAct - opPrev,
        yoyVarianceRate: opPrev !== 0 ? Math.round(((opAct - opPrev) / opPrev) * 100) : 0,
        budgetVariance: opAct - opBgt,
        budgetVarianceRate: opBgt !== 0 ? Math.round(((opAct - opBgt) / opBgt) * 100) : 0,
        isBold: true,
        isHighlight: true,
      },
      operatingMarginRate: {
        label: '営業利益率',
        previousYear: opRatePrev,
        budget: opRateBgt,
        actual: opRateAct,
        isRate: true,
      },
      ordinaryProfit: {
        label: '経常利益',
        previousYear: ordPrev,
        budget: ordBgt,
        actual: ordAct,
        yoyVariance: ordAct - ordPrev,
        yoyVarianceRate: ordPrev !== 0 ? Math.round(((ordAct - ordPrev) / ordPrev) * 100) : 0,
        budgetVariance: ordAct - ordBgt,
        budgetVarianceRate: ordBgt !== 0 ? Math.round(((ordAct - ordBgt) / ordBgt) * 100) : 0,
        isBold: true,
      },
    },
  };
}

/**
 * 通期見通しグラフデータを生成
 */
export function generateAnnualForecastChart(
  currentEntries: JournalEntry[],
  budget: AnnualBudget,
  actualQuarters: number,
  forecastEntries?: JournalEntry[],
  accounts: AccountMaster[] = DEFAULT_ACCOUNTS
): AnnualForecastChart {
  const quarters: Quarter[] = ['1Q', '2Q', '3Q', '4Q'];
  const budgetCumulative: number[] = [];
  const actualCumulative: number[] = [];

  let budgetRunning = 0;
  let actualRunning = 0;

  const allEntries = forecastEntries
    ? [...currentEntries, ...forecastEntries]
    : currentEntries;

  for (const q of quarters) {
    const months = getQuarterMonths(budget.fiscalYearStart, q);

    budgetRunning += sumBudgetByCategory(budget, months, 'revenue');
    budgetCumulative.push(budgetRunning);

    actualRunning += sumRevenue(allEntries, months, undefined, accounts);
    actualCumulative.push(actualRunning);
  }

  const budgetTotal = budgetCumulative[3];
  const actualTotal = actualCumulative[3];
  const diff = actualTotal - budgetTotal;
  const diffMan = Math.round(diff / 10000);

  return {
    title: `通期見通し`,
    subtitle: `売上目標 ${Math.round(budgetTotal / 10000)}万円に対し、通期 ${diffMan >= 0 ? '+' : ''}${diffMan}万の見通し`,
    quarters,
    budgetCumulative,
    actualCumulative,
    actualQuarters,
  };
}
