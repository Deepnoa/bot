import { type NextRequest, NextResponse } from "next/server"
import { Client, type WebhookEvent, validateSignature } from "@line/bot-sdk"
import { saveMessage, getUserMessages } from "@/lib/supabase"

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  channelSecret: process.env.LINE_CHANNEL_SECRET!,
}

const client = new Client(config)

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("x-line-signature")

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    if (!validateSignature(body, config.channelSecret, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
    }

    const events: WebhookEvent[] = JSON.parse(body).events

    await Promise.all(events.map(handleEventWithDB))

    return NextResponse.json({ message: "OK" })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function handleEventWithDB(event: WebhookEvent) {
  if (event.type === "message" && event.message.type === "text") {
    const text = event.message.text
    const userId = event.source.userId!

    // Save message to database
    await saveMessage(userId, text)

    let replyText = ""

    if (text.toLowerCase().includes("history") || text.toLowerCase().includes("履歴")) {
      // Get user's message history
      const messages = await getUserMessages(userId, 5)
      if (messages.length > 0) {
        const historyText = messages.map((msg, index) => `${index + 1}. ${msg.message_text}`).join("\n")
        replyText = `最近のメッセージ履歴:\n${historyText}`
      } else {
        replyText = "メッセージ履歴がありません。"
      }
    } else if (text.toLowerCase().includes("count") || text.toLowerCase().includes("カウント")) {
      const messages = await getUserMessages(userId, 1000)
      replyText = `これまでに ${messages.length} 件のメッセージを送信しています。`
    } else {
      replyText = `メッセージ「${text}」を保存しました！\n\n「history」で履歴を確認\n「count」でメッセージ数を確認`
    }

    await client.replyMessage(event.replyToken, {
      type: "text",
      text: replyText,
    })
  }
}
