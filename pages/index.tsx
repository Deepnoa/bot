import Head from "next/head"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import {
  BarChart3,
  MessageSquare,
  Calendar,
  Code,
  Settings,
} from "lucide-react"

export default function Home() {
  return (
    <>
      <Head>
        <title>LINE Bot Dashboard & Landing</title>
        <meta
          name="description"
          content="LINE Messaging API Webhook サーバー及び管理 UI"
        />
      </Head>
      <main className="container mx-auto p-6 space-y-12">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold">
            LINE Bot Webhook Dashboard & Landing
          </h1>
          <p className="text-lg text-muted-foreground">
            LINE Messaging API Webhook サーバー及び管理 UI
          </p>
        </header>

        {/* Pages Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Pages</h2>
          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  ダッシュボード
                </CardTitle>
                <CardDescription>
                  メッセージ統計とユーザー分析を確認
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard">
                  <Button className="w-full">開く</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  お問い合わせフォーム
                </CardTitle>
                <CardDescription>LIFF 予約・お問い合わせ</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/liff">
                  <Button className="w-full">開く</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  予約確認
                </CardTitle>
                <CardDescription>
                  IDを指定して予約内容を確認
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  例: /reservation/123e4567
                </p>
                <Link href="/reservation/123e4567">
                  <Button className="w-full">サンプル確認</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* API Endpoints Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">API Endpoints</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                API エンドポイント
              </CardTitle>
              <CardDescription>Webhook、統計、予約等のエンドポイント</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>
                  <code className="bg-muted p-1 rounded">
                    POST /api/webhook
                  </code>{" "}
                  LINE Webhook コールバック
                </li>
                <li>
                  <code className="bg-muted p-1 rounded">
                    POST /api/webhook-with-db
                  </code>{" "}
                  データベース付きWebhook
                </li>
                <li>
                  <code className="bg-muted p-1 rounded">
                    GET /api/stats
                  </code>{" "}
                  メッセージ統計情報を取得
                </li>
                <li>
                  <code className="bg-muted p-1 rounded">
                    POST /api/reserve
                  </code>{" "}
                  予約情報を登録
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Setup Instructions Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Setup Instructions</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                セットアップ手順
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <strong>1. 環境変数設定</strong>
                <p className="text-muted-foreground">
                  LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET, NEXT_PUBLIC_LIFF_ID,
                  Supabase URL & KEY を設定
                </p>
              </div>
              <div>
                <strong>2. Webhook URL 登録</strong>
                <p className="text-muted-foreground">
                  LINE Developers コンソールで Webhook URL を <code>/api/webhook</code>
                  に設定
                </p>
              </div>
              <div>
                <strong>3. データベース設定（オプション）</strong>
                <p className="text-muted-foreground">
                  Supabase でテーブル (inquiries) を作成
                </p>
              </div>
              <div>
                <strong>4. デプロイ</strong>
                <p className="text-muted-foreground">
                  Vercel, Heroku などにデプロイして公開
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  )
}
