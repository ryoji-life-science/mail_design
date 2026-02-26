import { AccountMaster } from '../types';

/**
 * デフォルトの勘定科目マスタ
 * マネーフォワードの標準科目名に対応
 */
export const DEFAULT_ACCOUNTS: AccountMaster[] = [
  // ── 流動資産 ──
  { code: '1100', name: '現金', category: 'current_assets', bsSection: 'assets', mfName: '現金' },
  { code: '1101', name: '普通預金', category: 'current_assets', bsSection: 'assets', mfName: '普通預金' },
  { code: '1102', name: '当座預金', category: 'current_assets', bsSection: 'assets', mfName: '当座預金' },
  { code: '1103', name: '定期預金', category: 'current_assets', bsSection: 'assets', mfName: '定期預金' },
  { code: '1200', name: '売掛金', category: 'current_assets', bsSection: 'assets', mfName: '売掛金' },
  { code: '1201', name: '受取手形', category: 'current_assets', bsSection: 'assets', mfName: '受取手形' },
  { code: '1300', name: '棚卸資産', category: 'current_assets', bsSection: 'assets', mfName: '棚卸資産' },
  { code: '1301', name: '商品', category: 'current_assets', bsSection: 'assets', mfName: '商品' },
  { code: '1302', name: '製品', category: 'current_assets', bsSection: 'assets', mfName: '製品' },
  { code: '1303', name: '仕掛品', category: 'current_assets', bsSection: 'assets', mfName: '仕掛品' },
  { code: '1304', name: '原材料', category: 'current_assets', bsSection: 'assets', mfName: '原材料' },
  { code: '1400', name: '前払費用', category: 'current_assets', bsSection: 'assets', mfName: '前払費用' },
  { code: '1401', name: '前渡金', category: 'current_assets', bsSection: 'assets', mfName: '前渡金' },
  { code: '1500', name: '未収入金', category: 'current_assets', bsSection: 'assets', mfName: '未収入金' },
  { code: '1501', name: '立替金', category: 'current_assets', bsSection: 'assets', mfName: '立替金' },
  { code: '1502', name: '仮払金', category: 'current_assets', bsSection: 'assets', mfName: '仮払金' },
  { code: '1600', name: '短期貸付金', category: 'current_assets', bsSection: 'assets', mfName: '短期貸付金' },

  // ── 固定資産 ──
  { code: '1700', name: '建物', category: 'fixed_assets', bsSection: 'assets', mfName: '建物' },
  { code: '1701', name: '建物附属設備', category: 'fixed_assets', bsSection: 'assets', mfName: '建物附属設備' },
  { code: '1710', name: '機械装置', category: 'fixed_assets', bsSection: 'assets', mfName: '機械装置' },
  { code: '1720', name: '車両運搬具', category: 'fixed_assets', bsSection: 'assets', mfName: '車両運搬具' },
  { code: '1730', name: '工具器具備品', category: 'fixed_assets', bsSection: 'assets', mfName: '工具器具備品' },
  { code: '1740', name: '土地', category: 'fixed_assets', bsSection: 'assets', mfName: '土地' },
  { code: '1750', name: 'ソフトウェア', category: 'fixed_assets', bsSection: 'assets', mfName: 'ソフトウェア' },
  { code: '1760', name: '投資有価証券', category: 'fixed_assets', bsSection: 'assets', mfName: '投資有価証券' },
  { code: '1770', name: '長期貸付金', category: 'fixed_assets', bsSection: 'assets', mfName: '長期貸付金' },
  { code: '1780', name: '敷金・保証金', category: 'fixed_assets', bsSection: 'assets', mfName: '敷金・保証金' },
  { code: '1790', name: '減価償却累計額', category: 'fixed_assets', bsSection: 'assets', mfName: '減価償却累計額' },

  // ── 流動負債 ──
  { code: '2100', name: '買掛金', category: 'current_liabilities', bsSection: 'liabilities', mfName: '買掛金' },
  { code: '2101', name: '支払手形', category: 'current_liabilities', bsSection: 'liabilities', mfName: '支払手形' },
  { code: '2200', name: '短期借入金', category: 'current_liabilities', bsSection: 'liabilities', mfName: '短期借入金' },
  { code: '2300', name: '未払金', category: 'current_liabilities', bsSection: 'liabilities', mfName: '未払金' },
  { code: '2301', name: '未払費用', category: 'current_liabilities', bsSection: 'liabilities', mfName: '未払費用' },
  { code: '2302', name: '未払法人税等', category: 'current_liabilities', bsSection: 'liabilities', mfName: '未払法人税等' },
  { code: '2303', name: '未払消費税等', category: 'current_liabilities', bsSection: 'liabilities', mfName: '未払消費税等' },
  { code: '2400', name: '前受金', category: 'current_liabilities', bsSection: 'liabilities', mfName: '前受金' },
  { code: '2401', name: '預り金', category: 'current_liabilities', bsSection: 'liabilities', mfName: '預り金' },
  { code: '2402', name: '仮受金', category: 'current_liabilities', bsSection: 'liabilities', mfName: '仮受金' },
  { code: '2500', name: '賞与引当金', category: 'current_liabilities', bsSection: 'liabilities', mfName: '賞与引当金' },

  // ── 固定負債 ──
  { code: '2600', name: '長期借入金', category: 'fixed_liabilities', bsSection: 'liabilities', mfName: '長期借入金' },
  { code: '2700', name: '退職給付引当金', category: 'fixed_liabilities', bsSection: 'liabilities', mfName: '退職給付引当金' },

  // ── 純資産 ──
  { code: '3100', name: '資本金', category: 'equity', bsSection: 'equity', mfName: '資本金' },
  { code: '3200', name: '資本準備金', category: 'equity', bsSection: 'equity', mfName: '資本準備金' },
  { code: '3300', name: '利益剰余金', category: 'equity', bsSection: 'equity', mfName: '利益剰余金' },
  { code: '3301', name: '繰越利益剰余金', category: 'equity', bsSection: 'equity', mfName: '繰越利益剰余金' },

  // ── 売上高 ──
  { code: '4100', name: '売上高', category: 'revenue', plSection: 'revenue', mfName: '売上高' },
  { code: '4101', name: '売上値引・戻り高', category: 'revenue', plSection: 'revenue', mfName: '売上値引・戻り高' },

  // ── 売上原価 ──
  { code: '5100', name: '仕入高', category: 'cost_of_sales', plSection: 'cost_of_sales', mfName: '仕入高' },
  { code: '5101', name: '外注費', category: 'cost_of_sales', plSection: 'cost_of_sales', mfName: '外注費' },
  { code: '5102', name: '期首商品棚卸高', category: 'cost_of_sales', plSection: 'cost_of_sales', mfName: '期首商品棚卸高' },
  { code: '5103', name: '期末商品棚卸高', category: 'cost_of_sales', plSection: 'cost_of_sales', mfName: '期末商品棚卸高' },
  { code: '5104', name: '材料費', category: 'cost_of_sales', plSection: 'cost_of_sales', mfName: '材料費' },
  { code: '5105', name: '労務費', category: 'cost_of_sales', plSection: 'cost_of_sales', mfName: '労務費' },
  { code: '5106', name: '製造経費', category: 'cost_of_sales', plSection: 'cost_of_sales', mfName: '製造経費' },

  // ── 販管費 ──
  { code: '6100', name: '役員報酬', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '役員報酬' },
  { code: '6101', name: '給料手当', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '給料手当' },
  { code: '6102', name: '賞与', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '賞与' },
  { code: '6103', name: '雑給', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '雑給' },
  { code: '6104', name: '法定福利費', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '法定福利費' },
  { code: '6105', name: '福利厚生費', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '福利厚生費' },
  { code: '6110', name: '広告宣伝費', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '広告宣伝費' },
  { code: '6111', name: '販売促進費', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '販売促進費' },
  { code: '6120', name: '旅費交通費', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '旅費交通費' },
  { code: '6121', name: '通信費', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '通信費' },
  { code: '6122', name: '消耗品費', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '消耗品費' },
  { code: '6123', name: '事務用品費', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '事務用品費' },
  { code: '6124', name: '水道光熱費', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '水道光熱費' },
  { code: '6125', name: '地代家賃', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '地代家賃' },
  { code: '6126', name: '保険料', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '保険料' },
  { code: '6127', name: '修繕費', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '修繕費' },
  { code: '6128', name: '租税公課', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '租税公課' },
  { code: '6129', name: '減価償却費', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '減価償却費' },
  { code: '6130', name: '支払手数料', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '支払手数料' },
  { code: '6131', name: '諸会費', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '諸会費' },
  { code: '6132', name: '会議費', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '会議費' },
  { code: '6133', name: '交際費', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '交際費' },
  { code: '6134', name: '新聞図書費', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '新聞図書費' },
  { code: '6135', name: '研修費', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '研修費' },
  { code: '6136', name: '業務委託費', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '業務委託費' },
  { code: '6137', name: '支払報酬', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '支払報酬' },
  { code: '6138', name: 'リース料', category: 'sga_expenses', plSection: 'sga_expenses', mfName: 'リース料' },
  { code: '6199', name: '雑費', category: 'sga_expenses', plSection: 'sga_expenses', mfName: '雑費' },

  // ── 営業外収益 ──
  { code: '7100', name: '受取利息', category: 'non_operating_income', plSection: 'non_operating_income', mfName: '受取利息' },
  { code: '7101', name: '受取配当金', category: 'non_operating_income', plSection: 'non_operating_income', mfName: '受取配当金' },
  { code: '7102', name: '為替差益', category: 'non_operating_income', plSection: 'non_operating_income', mfName: '為替差益' },
  { code: '7199', name: '雑収入', category: 'non_operating_income', plSection: 'non_operating_income', mfName: '雑収入' },

  // ── 営業外費用 ──
  { code: '7200', name: '支払利息', category: 'non_operating_expense', plSection: 'non_operating_expense', mfName: '支払利息' },
  { code: '7201', name: '為替差損', category: 'non_operating_expense', plSection: 'non_operating_expense', mfName: '為替差損' },
  { code: '7299', name: '雑損失', category: 'non_operating_expense', plSection: 'non_operating_expense', mfName: '雑損失' },

  // ── 特別利益 ──
  { code: '8100', name: '固定資産売却益', category: 'extraordinary_income', plSection: 'extraordinary_income', mfName: '固定資産売却益' },

  // ── 特別損失 ──
  { code: '8200', name: '固定資産売却損', category: 'extraordinary_expense', plSection: 'extraordinary_expense', mfName: '固定資産売却損' },
  { code: '8201', name: '固定資産除却損', category: 'extraordinary_expense', plSection: 'extraordinary_expense', mfName: '固定資産除却損' },

  // ── 法人税等 ──
  { code: '9100', name: '法人税、住民税及び事業税', category: 'tax', plSection: 'tax', mfName: '法人税、住民税及び事業税' },
  { code: '9101', name: '法人税等調整額', category: 'tax', plSection: 'tax', mfName: '法人税等調整額' },
];

/** 科目名から勘定科目マスタを検索 */
export function findAccountByName(
  name: string,
  accounts: AccountMaster[] = DEFAULT_ACCOUNTS
): AccountMaster | undefined {
  // 完全一致
  const exact = accounts.find(a => a.name === name || a.mfName === name);
  if (exact) return exact;
  // 部分一致
  return accounts.find(a =>
    a.name.includes(name) || name.includes(a.name) ||
    (a.mfName && (a.mfName.includes(name) || name.includes(a.mfName)))
  );
}

/** 科目コードから勘定科目マスタを検索 */
export function findAccountByCode(
  code: string,
  accounts: AccountMaster[] = DEFAULT_ACCOUNTS
): AccountMaster | undefined {
  return accounts.find(a => a.code === code);
}

/** カテゴリがB/S科目かどうか */
export function isBSCategory(category: string): boolean {
  return [
    'current_assets', 'fixed_assets',
    'current_liabilities', 'fixed_liabilities',
    'equity'
  ].includes(category);
}

/** カテゴリがP/L科目かどうか */
export function isPLCategory(category: string): boolean {
  return [
    'revenue', 'cost_of_sales', 'sga_expenses',
    'non_operating_income', 'non_operating_expense',
    'extraordinary_income', 'extraordinary_expense', 'tax'
  ].includes(category);
}
