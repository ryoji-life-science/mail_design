import {
  JournalEntry,
  CashFlowStatement,
  CFSection,
  CFLineItem,
  IncomeStatement,
  AccountMaster,
} from '../types';
import { DEFAULT_ACCOUNTS, findAccountByCode } from '../utils/accounts';

/**
 * キャッシュフロー計算書（C/F）を生成 - 間接法
 *
 * 損益計算書と仕訳データからキャッシュフロー計算書を構成する。
 */
export function generateCashFlowStatement(
  entries: JournalEntry[],
  periodStart: string,
  periodEnd: string,
  pl: IncomeStatement,
  previousEntries: JournalEntry[] = [],
  accounts: AccountMaster[] = DEFAULT_ACCOUNTS
): CashFlowStatement {
  const filtered = entries.filter(e => e.date >= periodStart && e.date <= periodEnd);

  // 期首・期末の残高を計算
  const getBalance = (targetEntries: JournalEntry[], accountCode: string): number => {
    let balance = 0;
    const account = findAccountByCode(accountCode, accounts);
    if (!account) return 0;

    for (const entry of targetEntries) {
      if (entry.accountCode !== accountCode) continue;
      if (account.bsSection === 'assets') {
        balance += entry.debit - entry.credit;
      } else {
        balance += entry.credit - entry.debit;
      }
    }
    return balance;
  };

  // B/S科目の期間中の増減を計算
  const getChangeInPeriod = (accountCode: string): number => {
    let change = 0;
    const account = findAccountByCode(accountCode, accounts);
    if (!account) return 0;

    for (const entry of filtered) {
      if (entry.accountCode !== accountCode) continue;
      if (account.bsSection === 'assets') {
        change += entry.debit - entry.credit;
      } else {
        change += entry.credit - entry.debit;
      }
    }
    return change;
  };

  // ── 営業活動によるキャッシュフロー（間接法） ──
  const operatingItems: CFLineItem[] = [];

  // 税引前当期純利益
  operatingItems.push({ label: '税引前当期純利益', amount: pl.incomeBeforeTax });

  // 減価償却費（加算）
  const depreciation = pl.sgaExpenses.items
    .filter(item => item.accountName.includes('減価償却'))
    .reduce((sum, item) => sum + item.amount, 0);
  if (depreciation !== 0) {
    operatingItems.push({ label: '減価償却費', amount: depreciation });
  }

  // 売上債権の増減（増加はマイナス）
  const arChange = getChangeInPeriod('1200'); // 売掛金
  if (arChange !== 0) {
    operatingItems.push({ label: '売上債権の増減額', amount: -arChange });
  }

  // 棚卸資産の増減（増加はマイナス）
  const inventoryChange = getChangeInPeriod('1300') + getChangeInPeriod('1301') +
    getChangeInPeriod('1302') + getChangeInPeriod('1303') + getChangeInPeriod('1304');
  if (inventoryChange !== 0) {
    operatingItems.push({ label: '棚卸資産の増減額', amount: -inventoryChange });
  }

  // 仕入債務の増減（増加はプラス）
  const apChange = getChangeInPeriod('2100'); // 買掛金
  if (apChange !== 0) {
    operatingItems.push({ label: '仕入債務の増減額', amount: apChange });
  }

  // 未払金の増減
  const unpaidChange = getChangeInPeriod('2300');
  if (unpaidChange !== 0) {
    operatingItems.push({ label: '未払金の増減額', amount: unpaidChange });
  }

  // 前受金の増減
  const advanceChange = getChangeInPeriod('2400');
  if (advanceChange !== 0) {
    operatingItems.push({ label: '前受金の増減額', amount: advanceChange });
  }

  // 利息収入（営業外で計上するためここでは減算）
  const interestIncome = pl.nonOperatingIncome.items
    .filter(item => item.accountName.includes('受取利息'))
    .reduce((sum, item) => sum + item.amount, 0);
  if (interestIncome !== 0) {
    operatingItems.push({ label: '受取利息', amount: -interestIncome });
  }

  // 支払利息（営業外で計上するためここでは加算）
  const interestExpense = pl.nonOperatingExpense.items
    .filter(item => item.accountName.includes('支払利息'))
    .reduce((sum, item) => sum + item.amount, 0);
  if (interestExpense !== 0) {
    operatingItems.push({ label: '支払利息', amount: interestExpense });
  }

  // 法人税等の支払
  const taxPaid = pl.tax.total;
  if (taxPaid !== 0) {
    operatingItems.push({ label: '法人税等の支払額', amount: -taxPaid });
  }

  const operatingTotal = operatingItems.reduce((sum, item) => sum + item.amount, 0);

  // ── 投資活動によるキャッシュフロー ──
  const investingItems: CFLineItem[] = [];

  // 固定資産の取得
  const fixedAssetCategories = ['1700', '1701', '1710', '1720', '1730', '1750'];
  let fixedAssetAcquisition = 0;
  for (const code of fixedAssetCategories) {
    const change = getChangeInPeriod(code);
    if (change > 0) fixedAssetAcquisition += change;
  }
  if (fixedAssetAcquisition !== 0) {
    investingItems.push({ label: '有形・無形固定資産の取得', amount: -fixedAssetAcquisition });
  }

  // 投資有価証券の取得
  const investmentChange = getChangeInPeriod('1760');
  if (investmentChange > 0) {
    investingItems.push({ label: '投資有価証券の取得', amount: -investmentChange });
  }

  // 敷金・保証金
  const depositChange = getChangeInPeriod('1780');
  if (depositChange !== 0) {
    investingItems.push({ label: '敷金・保証金の増減', amount: -depositChange });
  }

  const investingTotal = investingItems.reduce((sum, item) => sum + item.amount, 0);

  // ── 財務活動によるキャッシュフロー ──
  const financingItems: CFLineItem[] = [];

  // 短期借入金の増減
  const shortTermLoanChange = getChangeInPeriod('2200');
  if (shortTermLoanChange !== 0) {
    financingItems.push({ label: '短期借入金の増減', amount: shortTermLoanChange });
  }

  // 長期借入金の増減
  const longTermLoanChange = getChangeInPeriod('2600');
  if (longTermLoanChange !== 0) {
    financingItems.push({ label: '長期借入金の増減', amount: longTermLoanChange });
  }

  const financingTotal = financingItems.reduce((sum, item) => sum + item.amount, 0);

  // 現金の計算
  const cashCodes = ['1100', '1101', '1102', '1103'];
  const allPreviousEntries = [...previousEntries];
  let beginningCash = 0;
  for (const code of cashCodes) {
    beginningCash += getBalance(allPreviousEntries, code);
  }

  const netChange = operatingTotal + investingTotal + financingTotal;
  const endingCash = beginningCash + netChange;

  return {
    periodStart,
    periodEnd,
    operating: {
      label: '営業活動によるキャッシュフロー',
      items: operatingItems,
      total: operatingTotal,
    },
    investing: {
      label: '投資活動によるキャッシュフロー',
      items: investingItems,
      total: investingTotal,
    },
    financing: {
      label: '財務活動によるキャッシュフロー',
      items: financingItems,
      total: financingTotal,
    },
    netChange,
    beginningCash,
    endingCash,
  };
}
