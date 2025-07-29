# 📜 Codex Git運用ルール（2025年版）

---

## 🔧 基本原則

- `main` ブランチは保護対象とし，**直接のコミットは禁止**
- 作業は必ずブランチを切ってから実施すること
- **Codex経由でファイルを追加・変更する場合もこの原則に従う**
- 作業対象・変更範囲を `.md` に明示すること（AIが自動解釈しやすくするため）

---

## 📁 ブランチ運用ルール

| 用途             | 命名規則                 | 内容                              |
|------------------|--------------------------|-----------------------------------|
| 機能追加         | `feature/<機能名>`       | 新機能やUI構築                    |
| バグ修正         | `fix/<修正内容>`         | 小規模な修正、バグフィックス      |
| スナップショット保存 | `snapshot/<状態名>` | 状態保存用ブランチ（定期的に作成） |

✅ 作業例：
```bash
git checkout -b feature/receipt-autofill
# 作業後
git add .
git commit -m "✨ レシート自動入力パネル追加"
git checkout main
git merge feature/receipt-autofill
```

---

## 💾 コミットポリシー

- **1タスク1コミット**
- プレフィックスで目的を明示：
  - `✨` 新機能
  - `🔧` 設定変更・コード調整
  - `🐛` バグ修正
  - `🧪` テスト追加
  - `🔐` 安全性・スナップショット対応

例：
```bash
git commit -m "🐛 description が空文字列になる問題を修正"
```

---

## 🧠 Codex タスクの書き方ルール（.md）

Codex へ依頼する際の `.md` ファイルには以下を含めること：
```markdown
---
🔨 対象:
- backend/app/api/expense_agent.py
- frontend/src/lib/runExpenseFlow.ts

# ✅ 動作確認済み:
- uvicorn main:app 起動 OK
- 経費チャットで description が正しく埋まることを確認
---
```

---

## 🚧 mainブランチへの例外コミット

以下の条件を満たす場合に限り，Codexの自動承認により `main` 直コミットを許可：
1. `.md` ファイルに `# ⚠️ main直コミット許可済み` を記述
2. または `codex.rc` に対象ファイルが明示されている場合（例： `allow_additions`）

---

## 📂 Codexによるファイル追加の制御

Codex CLI の安全制御により，新規ファイルの追加は次のいずれかで許可される：
- `.md` ファイルに対象パスを記述（`🔨 対象:`）
- `codex.rc` の `allow_additions` に明記
- 作業用ブランチ上で実行されていること

---

## ✅ スナップショットルール

安定状態またはリリース直前にはスナップショット保存を行う：
```bash
git checkout -b snapshot/chat-ui-stable
git push origin snapshot/chat-ui-stable
```

---

## 📌 推奨ツール

- Codex CLI
- Cursor.dev（レビュー／提案視覚化）
- Obsidian（ドキュメント連携）
- Supabase Studio（データ確認）

---

## 💬 備考

このポリシーは `DeepNoa` プロジェクト内での AI／LLM駆動開発を安全・効率的に進めるために設計されています。今後も運用に応じて適宜更新を行います。