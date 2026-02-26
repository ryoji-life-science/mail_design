import {
  JournalEntry,
  IncomeStatement,
  PLGroup,
  PLLineItem,
  AccountMaster,
} from '../types';
import { DEFAULT_ACCOUNTS, findAccountByCode } from '../utils/accounts';

/**
 * 損益計算書（P/L）を生成
 *
 * 指定期間の仕訳データから損益計算書を構成する。
 */
export function generateIncomeStatement(
  entries: JournalEntry[],
  periodStart: string,
  periodEnd: string,
  accounts: AccountMaster[] = DEFAULT_ACCOUNTS
): IncomeStatement {
  // 期間内の仕訳を抽出
  const filtered = entries.filter(e => e.date >= periodStart && e.date <= periodEnd);

  // 科目別に集計
  const amounts = new Map<string, number>();

  for (const entry of filtered) {
    const account = findAccountByCode(entry.accountCode, accounts);
    if (!account?.plSection) continue;

    const current = amounts.get(entry.accountCode) ?? 0;

    if (
      account.category === 'revenue' ||
      account.category === 'non_operating_income' ||
      account.category === 'extraordinary_income'
    ) {
      // 収益科目: 貸方がプラス
      amounts.set(entry.accountCode, current + entry.credit - entry.debit);
    } else {
      // 費用科目: 借方がプラス
      amounts.set(entry.accountCode, current + entry.debit - entry.credit);
    }
  }

  // 各区分のグループを作成
  const createGroup = (label: string, category: string): PLGroup => {
    const categoryAccounts = accounts.filter(a => a.category === category);
    const items: PLLineItem[] = [];

    for (const acct of categoryAccounts) {
      const amount = amounts.get(acct.code);
      if (amount !== undefined && amount !== 0) {
        items.push({
          accountCode: acct.code,
          accountName: acct.name,
          amount,
        });
      }
    }

    return {
      label,
      items,
      total: items.reduce((sum, item) => sum + item.amount, 0),
    };
  };

  const revenue = createGroup('売上高', 'revenue');
  const costOfSales = createGroup('売上原価', 'cost_of_sales');
  const grossProfit = revenue.total - costOfSales.total;

  const sgaExpenses = createGroup('販売費及び一般管理費', 'sga_expenses');
  const operatingIncome = grossProfit - sgaExpenses.total;

  const nonOperatingIncome = createGroup('営業外収益', 'non_operating_income');
  const nonOperatingExpense = createGroup('営業外費用', 'non_operating_expense');
  const ordinaryIncome = operatingIncome + nonOperatingIncome.total - nonOperatingExpense.total;

  const extraordinaryIncome = createGroup('特別利益', 'extraordinary_income');
  const extraordinaryExpense = createGroup('特別損失', 'extraordinary_expense');
  const incomeBeforeTax = ordinaryIncome + extraordinaryIncome.total - extraordinaryExpense.total;

  const tax = createGroup('法人税等', 'tax');
  const netIncome = incomeBeforeTax - tax.total;

  return {
    periodStart,
    periodEnd,
    revenue,
    costOfSales,
    grossProfit,
    sgaExpenses,
    operatingIncome,
    nonOperatingIncome,
    nonOperatingExpense,
    ordinaryIncome,
    extraordinaryIncome,
    extraordinaryExpense,
    incomeBeforeTax,
    tax,
    netIncome,
  };
}
