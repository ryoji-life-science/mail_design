import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { JournalEntry, MFJournalRow, AccountMaster } from '../types';
import { findAccountByName, DEFAULT_ACCOUNTS } from '../utils/accounts';
import { normalizeDate } from '../utils/date';

/**
 * マネーフォワードCSV（仕訳帳エクスポート）パーサー
 *
 * マネーフォワードの仕訳帳CSVを読み込み、内部の仕訳データに変換する。
 * CSVのカラム構成:
 *   取引No, 取引日, 借方勘定科目, 借方補助科目, 借方部門, 借方税区分,
 *   借方金額(税込), 借方金額(税抜), 借方消費税額,
 *   貸方勘定科目, 貸方補助科目, 貸方部門, 貸方税区分,
 *   貸方金額(税込), 貸方金額(税抜), 貸方消費税額, 摘要
 */
export function parseMFJournalCSV(
  filePath: string,
  accounts: AccountMaster[] = DEFAULT_ACCOUNTS
): JournalEntry[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseMFJournalContent(content, accounts);
}

export function parseMFJournalContent(
  content: string,
  accounts: AccountMaster[] = DEFAULT_ACCOUNTS
): JournalEntry[] {
  // BOM除去
  const cleaned = content.replace(/^\uFEFF/, '');

  const records = parse(cleaned, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relaxColumnCount: true,
  }) as Record<string, string>[];

  const entries: JournalEntry[] = [];

  for (const row of records) {
    // カラム名の正規化（マネーフォワードのCSVカラム名にゆらぎがあるため）
    const normalized = normalizeColumns(row);
    if (!normalized) continue;

    const date = normalizeDate(normalized.取引日);
    const debitAmount = parseAmount(normalized.借方金額);
    const creditAmount = parseAmount(normalized.貸方金額);

    // 借方エントリ
    if (normalized.借方勘定科目 && debitAmount !== 0) {
      const account = findAccountByName(normalized.借方勘定科目, accounts);
      entries.push({
        date,
        accountCode: account?.code ?? 'UNKNOWN',
        accountName: normalized.借方勘定科目,
        subAccountName: normalized.借方補助科目 || undefined,
        departmentName: normalized.借方部門 || undefined,
        debit: debitAmount,
        credit: 0,
        description: normalized.摘要 || undefined,
        taxCategory: normalized.借方税区分 || undefined,
      });
    }

    // 貸方エントリ
    if (normalized.貸方勘定科目 && creditAmount !== 0) {
      const account = findAccountByName(normalized.貸方勘定科目, accounts);
      entries.push({
        date,
        accountCode: account?.code ?? 'UNKNOWN',
        accountName: normalized.貸方勘定科目,
        subAccountName: normalized.貸方補助科目 || undefined,
        departmentName: normalized.貸方部門 || undefined,
        debit: 0,
        credit: creditAmount,
        description: normalized.摘要 || undefined,
        taxCategory: normalized.貸方税区分 || undefined,
      });
    }
  }

  return entries;
}

/** マネーフォワードCSV（残高試算表エクスポート）パーサー */
export function parseMFTrialBalanceCSV(
  filePath: string,
  accounts: AccountMaster[] = DEFAULT_ACCOUNTS
): { accountName: string; accountCode: string; debitBalance: number; creditBalance: number }[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const cleaned = content.replace(/^\uFEFF/, '');

  const records = parse(cleaned, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relaxColumnCount: true,
  }) as Record<string, string>[];

  return records
    .filter(r => r['勘定科目'] || r['科目名'])
    .map(r => {
      const name = r['勘定科目'] || r['科目名'] || '';
      const account = findAccountByName(name, accounts);
      return {
        accountName: name,
        accountCode: account?.code ?? 'UNKNOWN',
        debitBalance: parseAmount(r['借方残高'] || r['借方'] || '0'),
        creditBalance: parseAmount(r['貸方残高'] || r['貸方'] || '0'),
      };
    });
}

// ── 内部ヘルパー ──

function normalizeColumns(row: Record<string, string>): MFJournalRow | null {
  const txDate = row['取引日'] || row['日付'] || row['仕訳日付'];
  if (!txDate) return null;

  return {
    取引No: row['取引No'] || row['No'] || '',
    取引日: txDate,
    借方勘定科目: row['借方勘定科目'] || row['借方科目'] || '',
    借方補助科目: row['借方補助科目'] || '',
    借方部門: row['借方部門'] || '',
    借方税区分: row['借方税区分'] || '',
    借方金額: row['借方金額(税込)'] || row['借方金額'] || '0',
    貸方勘定科目: row['貸方勘定科目'] || row['貸方科目'] || '',
    貸方補助科目: row['貸方補助科目'] || '',
    貸方部門: row['貸方部門'] || '',
    貸方税区分: row['貸方税区分'] || '',
    貸方金額: row['貸方金額(税込)'] || row['貸方金額'] || '0',
    摘要: row['摘要'] || '',
  };
}

function parseAmount(value: string): number {
  if (!value) return 0;
  // カンマ、スペース、円マークを除去
  const cleaned = value.replace(/[,\s¥￥円]/g, '');
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}
