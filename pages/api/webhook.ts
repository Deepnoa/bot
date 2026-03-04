import type { NextApiRequest, NextApiResponse } from "next"
import { type WebhookEvent, validateSignature } from "@line/bot-sdk"
import { query } from "@/lib/postgres"

export const config = {
  api: {
    bodyParser: false,
  },
}

function getRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []
    req.on("data", (chunk) =>
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk)
    )
    req.on("end", () => resolve(Buffer.concat(chunks).toString()))
    req.on("error", reject)
  })
}

async function enqueueLineMessage(userId: string, replyToken: string, userMsg: string) {
  await query(
    `INSERT INTO queue_line (user_id, reply_token, user_msg, status)
     VALUES ($1, $2, $3, queued)`,
    [userId, replyToken, userMsg]
  )
}

async function saveLineMessage(userId: string, messageText: string) {
  try {
    await query(
      `INSERT INTO line_messages (user_id, message_text, message_type, timestamp)
       VALUES ($1, $2, text, NOW())`,
      [userId, messageText]
    )
  } catch (error) {
    console.error("line_messages insert skipped:", error)
  }
}

async function handleEvent(event: WebhookEvent): Promise<void> {
  if (event.type !== "message" || event.message.type !== "text") {
    return
  }

  const userId = event.source.userId
  if (!userId) {
    return
  }

  const text = event.message.text.trim()
  if (!text) {
    return
  }

  await enqueueLineMessage(userId, event.replyToken, text)
  await saveLineMessage(userId, text)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).end("Method Not Allowed")
  }

  const signature = req.headers["x-line-signature"] as string | undefined
  if (!signature) {
    return res.status(400).json({ error: "No signature" })
  }

  try {
    const rawBody = await getRawBody(req)

    if (!validateSignature(rawBody, process.env.LINE_CHANNEL_SECRET!, signature)) {
      return res.status(403).json({ error: "Invalid signature" })
    }

    const { events } = JSON.parse(rawBody) as { events: WebhookEvent[] }
    await Promise.all(events.map((event) => handleEvent(event)))

    return res.status(200).json({ message: "queued" })
  } catch (error) {
    console.error("Webhook error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
