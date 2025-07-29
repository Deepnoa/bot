import { type NextRequest, NextResponse } from "next/server"
import { Client, type WebhookEvent, validateSignature } from "@line/bot-sdk"

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

    // Validate signature
    if (!validateSignature(body, config.channelSecret, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
    }

    const events: WebhookEvent[] = JSON.parse(body).events

    // Process each event
    await Promise.all(events.map(handleEvent))

    return NextResponse.json({ message: "OK" })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function handleEvent(event: WebhookEvent) {
  if (event.type === "message" && event.message.type === "text") {
    const text = event.message.text
    const userId = event.source.userId

    // Log the message (you can save to database here)
    console.log(`User ${userId} sent: ${text}`)

    // Handle different commands
    let replyText = ""

    if (text.toLowerCase().includes("hello") || text.toLowerCase().includes("こんにちは")) {
      replyText = "こんにちは！👋 何かお手伝いできることはありますか？"
    } else if (text.toLowerCase().includes("help") || text.toLowerCase().includes("ヘルプ")) {
      replyText = `利用可能なコマンド：
• hello - 挨拶
• help - このヘルプを表示
• status - ボットの状態を確認
• time - 現在時刻を表示`
    } else if (text.toLowerCase().includes("status")) {
      replyText = "✅ ボットは正常に動作しています！"
    } else if (text.toLowerCase().includes("time")) {
      const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
      replyText = `現在時刻: ${now}`
    } else {
      replyText = `「${text}」というメッセージを受信しました。\n\n「help」と送信すると利用可能なコマンドを確認できます。`
    }

    // Reply to user
    await client.replyMessage(event.replyToken, {
      type: "text",
      text: replyText,
    })
  } else if (event.type === "follow") {
    // Handle when user follows the bot
    await client.replyMessage(event.replyToken, {
      type: "text",
      text: "フォローありがとうございます！🎉\n\n「help」と送信すると利用可能なコマンドを確認できます。",
    })
  } else if (event.type === "unfollow") {
    // Handle when user unfollows the bot
    console.log("User unfollowed:", event.source.userId)
  }
}
