✅ Codex用セッション初期化指示テンプレ

以下のファイルをセッション開始時に読み込んで前提知識として保持してください：

1. 初期化スクリプト（共通ルール・構成概要）

/Users/shufukazawa/Documents/GitHub/line-bot-webhook/codex/session_notes/init_session.sh

3. 直近の開発タスク内容

git log --name-only --oneline に基づき、最新の codex/tasks/*.md を確認のうえ読み取り・参照してください

📌 開発時の運用ルール

	codex/rules/git_policy.md に沿ってブランチ運用・コミット・マージを行うこと

指定がある場合は .test.ts による動作確認を ts-node などで実行・報告すること

各変更の内容を明記し、完了後に簡潔な報告を行うこと（どのファイルをどう変更したかなど）

セッション開始後、上記の準備が完了したら「✅ 初期化完了」と出力してください。

