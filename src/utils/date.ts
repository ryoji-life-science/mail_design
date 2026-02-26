import dayjs from 'dayjs';

/** YYYY-MM 形式の文字列から年月を取得 */
export function parseYearMonth(ym: string): { year: number; month: number } {
  const [year, month] = ym.split('-').map(Number);
  return { year, month };
}

/** 期間内の月リストを生成 */
export function getMonthRange(start: string, end: string): string[] {
  const months: string[] = [];
  let current = dayjs(start).startOf('month');
  const endDate = dayjs(end).startOf('month');

  while (current.isBefore(endDate) || current.isSame(endDate, 'month')) {
    months.push(current.format('YYYY-MM'));
    current = current.add(1, 'month');
  }
  return months;
}

/** 日付文字列を YYYY-MM-DD に正規化 */
export function normalizeDate(dateStr: string): string {
  // 2026/01/15 → 2026-01-15
  const cleaned = dateStr.replace(/\//g, '-').trim();
  return dayjs(cleaned).format('YYYY-MM-DD');
}

/** 日付から YYYY-MM を取得 */
export function toYearMonth(dateStr: string): string {
  return dayjs(dateStr.replace(/\//g, '-')).format('YYYY-MM');
}

/** 会計年度の開始月・終了月を取得 */
export function getFiscalYear(
  date: string,
  fiscalYearStartMonth: number
): { start: string; end: string } {
  const d = dayjs(date);
  const month = d.month() + 1; // dayjs month is 0-indexed

  let startYear: number;
  if (month >= fiscalYearStartMonth) {
    startYear = d.year();
  } else {
    startYear = d.year() - 1;
  }

  const start = dayjs(`${startYear}-${String(fiscalYearStartMonth).padStart(2, '0')}-01`);
  const end = start.add(11, 'month').endOf('month');

  return {
    start: start.format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD'),
  };
}

/** 金額をカンマ区切りでフォーマット */
export function formatCurrency(amount: number): string {
  return Math.round(amount).toLocaleString('ja-JP');
}

/** パーセンテージをフォーマット */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
