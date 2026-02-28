# Google Forms Generator

Google フォームを GUI で簡単に自動生成するWebツール。

## 機能

- Google アカウントでログイン（OAuth 2.0）
- フォームのタイトル・説明を設定
- 質問の追加・編集・削除・並べ替え
- 対応する質問タイプ:
  - 短文回答
  - 長文回答
  - ラジオボタン（単一選択）
  - チェックボックス（複数選択）
  - プルダウン
  - 均等目盛り（スケール）
  - 日付
  - 時刻
- ワンクリックで Google Forms API を使ってフォームを生成
- 生成後、回答用URL・編集用URLを表示

## セットアップ

### 1. Google Cloud Console の設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. **Google Forms API** を有効化
3. **OAuth 同意画面** を設定（外部ユーザー向け）
4. **認証情報** > **OAuth 2.0 クライアント ID** を作成
   - アプリケーションの種類: ウェブアプリケーション
   - 承認済みリダイレクト URI: `http://localhost:3000/api/auth/callback/google`（開発時）
   - 本番用: `https://your-domain.vercel.app/api/auth/callback/google`

### 2. 環境変数の設定

`.env.example` をコピーして `.env.local` を作成:

```bash
cp .env.example .env.local
```

以下の値を設定:

```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
NEXTAUTH_SECRET=your_secret  # openssl rand -base64 32 で生成
NEXTAUTH_URL=http://localhost:3000
```

### 3. 開発サーバーの起動

```bash
npm install
npm run dev
```

http://localhost:3000 でアクセス可能。

## Vercel デプロイ

1. Vercel にリポジトリを接続
2. 環境変数を設定（`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`）
3. Google Cloud Console のリダイレクト URI に Vercel の URL を追加

## 技術スタック

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- NextAuth.js (Google OAuth)
- Google Forms API
