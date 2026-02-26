import {
  JournalEntry,
  BalanceSheet,
  BSGroup,
  BSLineItem,
  AccountMaster,
} from '../types';
import { DEFAULT_ACCOUNTS, findAccountByCode } from '../utils/accounts';
import { toYearMonth } from '../utils/date';

/**
 * 貸借対照表（B/S）を生成
 *
 * 仕訳データから指定日時点の残高を集計し、B/Sを構成する。
 */
export function generateBalanceSheet(
  entries: JournalEntry[],
  asOfDate: string,
  accounts: AccountMaster[] = DEFAULT_ACCOUNTS
): BalanceSheet {
  // 指定日以前の仕訳を抽出
  const filtered = entries.filter(e => e.date <= asOfDate);

  // 勘定科目別の残高を集計
  const balances = new Map<string, number>();

  for (const entry of filtered) {
    const current = balances.get(entry.accountCode) ?? 0;
    const account = findAccountByCode(entry.accountCode, accounts);

    if (!account) {
      // 不明科目はスキップ
      continue;
    }

    // B/S科目のみ
    if (!account.bsSection) continue;

    if (account.bsSection === 'assets') {
      // 資産: 借方増加、貸方減少
      balances.set(entry.accountCode, current + entry.debit - entry.credit);
    } else {
      // 負債・純資産: 貸方増加、借方減少
      balances.set(entry.accountCode, current + entry.credit - entry.debit);
    }
  }

  // P/L科目の当期純利益を繰越利益剰余金に加算
  let netIncome = 0;
  for (const entry of filtered) {
    const account = findAccountByCode(entry.accountCode, accounts);
    if (!account?.plSection) continue;

    if (account.category === 'revenue' || account.category === 'non_operating_income' || account.category === 'extraordinary_income') {
      netIncome += entry.credit - entry.debit;
    } else {
      netIncome -= entry.debit - entry.credit;
    }
  }
  const retainedCode = '3301'; // 繰越利益剰余金
  const retainedCurrent = balances.get(retainedCode) ?? 0;
  balances.set(retainedCode, retainedCurrent + netIncome);

  // B/Sの各セクションに分類
  const assetItems: BSLineItem[] = [];
  const liabilityItems: BSLineItem[] = [];
  const equityItems: BSLineItem[] = [];

  // 流動資産
  const currentAssetAccounts = accounts.filter(a => a.category === 'current_assets');
  for (const acct of currentAssetAccounts) {
    const balance = balances.get(acct.code);
    if (balance !== undefined && balance !== 0) {
      assetItems.push({ accountCode: acct.code, accountName: acct.name, amount: balance });
    }
  }

  // 流動資産小計
  const currentAssetsTotal = assetItems.reduce((sum, item) => sum + item.amount, 0);
  assetItems.push({ accountCode: '', accountName: '流動資産合計', amount: currentAssetsTotal, isSubtotal: true });

  // 固定資産
  const fixedAssetStartIdx = assetItems.length;
  const fixedAssetAccounts = accounts.filter(a => a.category === 'fixed_assets');
  for (const acct of fixedAssetAccounts) {
    const balance = balances.get(acct.code);
    if (balance !== undefined && balance !== 0) {
      assetItems.push({ accountCode: acct.code, accountName: acct.name, amount: balance });
    }
  }
  const fixedAssetsTotal = assetItems.slice(fixedAssetStartIdx).reduce((sum, item) => sum + item.amount, 0);
  assetItems.push({ accountCode: '', accountName: '固定資産合計', amount: fixedAssetsTotal, isSubtotal: true });

  // 流動負債
  const currentLiabilityAccounts = accounts.filter(a => a.category === 'current_liabilities');
  for (const acct of currentLiabilityAccounts) {
    const balance = balances.get(acct.code);
    if (balance !== undefined && balance !== 0) {
      liabilityItems.push({ accountCode: acct.code, accountName: acct.name, amount: balance });
    }
  }
  const currentLiabilitiesTotal = liabilityItems.reduce((sum, item) => sum + item.amount, 0);
  liabilityItems.push({ accountCode: '', accountName: '流動負債合計', amount: currentLiabilitiesTotal, isSubtotal: true });

  // 固定負債
  const fixedLiabilityStartIdx = liabilityItems.length;
  const fixedLiabilityAccounts = accounts.filter(a => a.category === 'fixed_liabilities');
  for (const acct of fixedLiabilityAccounts) {
    const balance = balances.get(acct.code);
    if (balance !== undefined && balance !== 0) {
      liabilityItems.push({ accountCode: acct.code, accountName: acct.name, amount: balance });
    }
  }
  const fixedLiabilitiesTotal = liabilityItems.slice(fixedLiabilityStartIdx).reduce((sum, item) => sum + item.amount, 0);
  liabilityItems.push({ accountCode: '', accountName: '固定負債合計', amount: fixedLiabilitiesTotal, isSubtotal: true });

  // 純資産
  const equityAccounts = accounts.filter(a => a.category === 'equity');
  for (const acct of equityAccounts) {
    const balance = balances.get(acct.code);
    if (balance !== undefined && balance !== 0) {
      equityItems.push({ accountCode: acct.code, accountName: acct.name, amount: balance });
    }
  }

  const assetsTotal = currentAssetsTotal + fixedAssetsTotal;
  const liabilitiesTotal = currentLiabilitiesTotal + fixedLiabilitiesTotal;
  const equityTotal = equityItems.reduce((sum, item) => sum + item.amount, 0);

  return {
    date: asOfDate,
    assets: {
      label: '資産の部',
      items: assetItems,
      total: assetsTotal,
    },
    liabilities: {
      label: '負債の部',
      items: liabilityItems,
      total: liabilitiesTotal,
    },
    equity: {
      label: '純資産の部',
      items: equityItems,
      total: equityTotal,
    },
  };
}
