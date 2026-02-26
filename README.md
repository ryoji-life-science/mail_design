# 財務経営資料 自動作成ツール

マネーフォワードCSVと手動入力データから、経営資料（予実対比・管理会計・財務3表）を自動生成するCLIツール。

## 事業部構成

| コード | 事業部名 |
|--------|----------|
| JINZAI | 人材育成事業 |
| SHUPPAN | 出版事業 |
| CHIIKI | 地域づくり事業 |
| SONOTA | その他の事業 |

## 出力レポート

### 経営資料（Excel）
- **四半期予実** - 1Q予算/実績/差異/増減%（事業部別売上内訳付き）
- **上半期予実** - 前期実績/予算/実績/対前年比差/対予算比差
- **通期見通し** - 前期実績/今期予算/今期予測/対予算比増減率
- **通期見通しグラフ** - 売上の予算vs実績/見込みの四半期累計推移
- **管理会計** - 部門別営業利益 + 人別稼働配分表

### 財務諸表（Excel + PDF）
- 貸借対照表（B/S）
- 損益計算書（P/L）
- キャッシュフロー計算書（C/F）
- 財務比率分析
- 月次推移表

## セットアップ

```bash
npm install
npm run build
```

## 使い方

### サンプルデータで全レポートを生成

```bash
# デフォルト（18期 1Q）
npm run generate

# 四半期を指定
npx ts-node src/index.ts generate -q 2Q

# 出力先を指定
npx ts-node src/index.ts generate -o ./output -q 1Q --period 18期
```

### マネーフォワードCSVをインポート

```bash
# CSVを読み込んで集計サマリーを表示
npx ts-node src/index.ts import-mf -f data/moneyforward.csv

# JSONに変換して保存
npx ts-node src/index.ts import-mf -f data/moneyforward.csv -o data/entries.json
```

## データ入力

### 1. マネーフォワードCSV
マネーフォワードの「仕訳帳」エクスポートCSVをそのまま読み込み可能。

### 2. 予算計画（年次・手動入力）
`data/sample/budget.json` を参考に、年度の売上・原価・販管費予算を月次で入力。
金額は万円単位。

### 3. 人員稼働割合（四半期・手動入力）
`data/sample/staff-allocation-2q.json` を参考に、各メンバーの事業部別稼働割合（%）を入力。

## プロジェクト構成

```
src/
├── index.ts                     # CLIエントリポイント
├── types/
│   ├── index.ts                 # 基本型定義（仕訳・財務諸表）
│   └── management-report.ts     # 経営資料型定義
├── parsers/
│   └── moneyforward.ts          # マネーフォワードCSVパーサー
├── models/
│   ├── budget.ts                # 予算計画モデル
│   └── allocation.ts            # 人員配賦モデル
├── reports/
│   ├── balance-sheet.ts         # 貸借対照表
│   ├── income-statement.ts      # 損益計算書
│   ├── cashflow.ts              # キャッシュフロー計算書
│   ├── ratio-analysis.ts        # 財務比率分析
│   ├── monthly-trend.ts         # 月次推移
│   ├── quarterly-budget-actual.ts # 予実対比レポート
│   └── management-accounting.ts # 管理会計レポート
├── output/
│   ├── excel.ts                 # 財務諸表Excel出力
│   ├── excel-management.ts      # 経営資料Excel出力
│   └── pdf.ts                   # PDF出力
├── utils/
│   ├── accounts.ts              # 勘定科目マスタ
│   └── date.ts                  # 日付ユーティリティ
└── sample-data/
    └── index.ts                 # サンプルデータ生成
```
