import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, BarChart3, Settings } from "lucide-react"

export default function Home() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">LINE Bot Webhook</h1>
        <p className="text-xl text-muted-foreground">Next.js + Supabase で構築されたLINE Bot管理システム</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              ダッシュボード
            </CardTitle>
            <CardDescription>メッセージ統計とユーザー分析を確認</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button className="w-full">ダッシュボードを開く</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Webhook設定
            </CardTitle>
            <CardDescription>LINE Developers Consoleでの設定方法</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Webhook URL:</strong>
              </p>
              <code className="block p-2 bg-muted rounded text-xs">https://your-domain.vercel.app/api/webhook</code>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            セットアップ手順
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h3 className="font-semibold">1. 環境変数設定</h3>
              <p className="text-sm text-muted-foreground">LINE_CHANNEL_ACCESS_TOKEN と LINE_CHANNEL_SECRET を設定</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">2. Webhook URL登録</h3>
              <p className="text-sm text-muted-foreground">LINE Developers Console でWebhook URLを設定</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">3. データベース設定</h3>
              <p className="text-sm text-muted-foreground">Supabaseでテーブルを作成（オプション）</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
