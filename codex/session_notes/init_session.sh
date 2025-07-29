#!/usr/bin/env bash
# ===================================================================
# Codex セッション初期化スクリプト
# 毎回実行して、SSH設定とリモートURLを初期化します
# ===================================================================

# GitHub リモート設定（内部SSH名で認証）
git remote set-url origin git@github.com:Deepnoa/line-bot-webhook.git

# SSH 接続確認（初回接続時に対話認証が発生することがあります）
ssh -T git@github.com || echo "⚠️ SSH接続未確認"

echo "[Init] Git origin and SSH check completed."