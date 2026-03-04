# OpenClaw + Qwen 3.5 セットアップガイド

## 前提条件

- [Ollama](https://ollama.com/) がインストール済みであること
- [OpenClaw](https://openclaw.ai/) がインストール済みであること

## Step 1: Ollama のインストールと起動

```bash
# Ollama をインストール（未インストールの場合）
curl -fsSL https://ollama.com/install.sh | sh

# Ollama サーバーを起動
ollama serve
```

## Step 2: Qwen 3.5 モデルのダウンロード

```bash
# デフォルト（7B相当）
ollama pull qwen3.5

# より高性能な14Bモデル（推奨: 16GB以上のRAM）
ollama pull qwen3.5:14b

# 最高性能の32Bモデル（推奨: 32GB以上のRAM）
ollama pull qwen3.5:32b
```

> **注意**: OpenClaw で安定して使うには 14B 以上のモデルを推奨します。
> 8B 以下のモデルはツール呼び出しでハルシネーションが起きやすいです。

## Step 3: OpenClaw の設定

### 方法A: CLI コマンドで設定

```bash
# Ollama をプロバイダとして登録
openclaw models auth paste-token --provider ollama

# Qwen 3.5 をデフォルトモデルに設定
openclaw config set agents.defaults.model.primary ollama/qwen3.5
```

### 方法B: 設定ファイルを直接編集

`~/.openclaw/openclaw.json` を以下の内容で作成・編集します:

```json
{
  "models": {
    "providers": {
      "ollama": {
        "baseUrl": "http://127.0.0.1:11434/v1",
        "apiKey": "ollama-local",
        "api": "openai-completions"
      }
    },
    "registry": {
      "ollama/qwen3.5": {
        "contextWindow": 131072,
        "maxTokens": 8192,
        "reasoning": false,
        "costs": {
          "inputPerMillion": 0,
          "outputPerMillion": 0
        }
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "ollama/qwen3.5"
      }
    }
  }
}
```

> **重要**: `"reasoning": false` に設定してください。
> `true` にすると Ollama が対応していない `developer` ロールメッセージが送信され、エラーになります。

## Step 4: 動作確認

```bash
# 利用可能なモデル一覧を確認
openclaw models list

# OpenClaw を起動して動作テスト
openclaw
```

## 代替: Alibaba Cloud DashScope API 経由（クラウド）

ローカルで動かさずクラウド API を使いたい場合:

1. [Alibaba Cloud Model Studio](https://dashscope.aliyuncs.com/) でアカウント作成
2. API キーを取得
3. 以下の設定を `openclaw.json` に追加:

```json
{
  "models": {
    "providers": {
      "dashscope": {
        "baseUrl": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        "apiKey": "DASHSCOPE_API_KEY",
        "api": "openai-completions"
      }
    },
    "registry": {
      "dashscope/qwen3-max": {
        "contextWindow": 131072,
        "maxTokens": 8192,
        "reasoning": false
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "dashscope/qwen3-max"
      }
    }
  }
}
```

```bash
# 環境変数に API キーを設定
export DASHSCOPE_API_KEY="your-api-key-here"
```

## 代替: Qwen Portal（無料 OAuth 認証）

```bash
# Qwen Portal プラグインを有効化
openclaw plugins enable qwen-portal-auth

# OAuth ログイン（ブラウザが開きます）
openclaw models auth login --provider qwen-portal --set-default
```

## トラブルシューティング

| 症状 | 対処法 |
|------|--------|
| 接続エラー | `ollama serve` が起動しているか確認 |
| モデルが見つからない | `ollama list` でモデルがダウンロード済みか確認 |
| ツール呼び出しが不安定 | 14B 以上のモデルに切り替える |
| `developer` ロールエラー | `"reasoning": false` に設定されているか確認 |
| コンテキスト不足 | Ollama 起動時に `OLLAMA_NUM_CTX=65536 ollama serve` で拡張 |

## 参考リンク

- [OpenClaw Model Providers ドキュメント](https://docs.openclaw.ai/concepts/model-providers)
- [Ollama 公式サイト](https://ollama.com/)
- [Qwen モデル一覧](https://ollama.com/library/qwen3.5)
