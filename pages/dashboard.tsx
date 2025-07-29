"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MessageCircle, Users, Clock, TrendingUp } from "lucide-react"

interface MessageStats {
  totalMessages: number
  uniqueUsers: number
  todayMessages: number
  recentMessages: Array<{
    id: string
    user_id: string
    message_text: string
    created_at: string
  }>
}

export default function Dashboard() {
  const [stats, setStats] = useState<MessageStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/stats")
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">読み込み中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">LINE Bot ダッシュボード</h1>
          <p className="text-muted-foreground">メッセージとユーザーの統計情報</p>
        </div>
        <Button onClick={fetchStats} variant="outline">
          更新
        </Button>
      </div>

      {stats && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総メッセージ数</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">累計受信メッセージ</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ユニークユーザー</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.uniqueUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">アクティブユーザー数</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">今日のメッセージ</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.todayMessages.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">本日受信分</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均/日</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(stats.totalMessages / 30).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">過去30日平均</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>最近のメッセージ</CardTitle>
              <CardDescription>直近に受信したメッセージ一覧</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentMessages.map((message, index) => (
                  <div key={message.id}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          ユーザー: {message.user_id.substring(0, 8)}...
                        </p>
                        <p className="text-sm text-muted-foreground">{message.message_text}</p>
                      </div>
                      <Badge variant="secondary">{new Date(message.created_at).toLocaleString("ja-JP")}</Badge>
                    </div>
                    {index < stats.recentMessages.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
