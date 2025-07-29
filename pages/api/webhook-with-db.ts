import type { NextApiRequest, NextApiResponse } from 'next'
import { Client, type WebhookEvent, validateSignature } from '@line/bot-sdk'
import { saveMessage, getUserMessages } from '@/lib/supabase'

export const config = {
  api: {
    bodyParser: false,
  },
}

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  channelSecret: process.env.LINE_CHANNEL_SECRET!,
})

function getRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []
    req.on('data', chunk => chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }

  const signature = req.headers['x-line-signature'] as string | undefined
  if (!signature) {
    return res.status(400).json({ error: 'No signature' })
  }

  try {
    const rawBody = await getRawBody(req)

    if (!validateSignature(rawBody, process.env.LINE_CHANNEL_SECRET!, signature)) {
      return res.status(403).json({ error: 'Invalid signature' })
    }

    const { events } = JSON.parse(rawBody) as { events: WebhookEvent[] }

    await Promise.all(events.map(handleEvent))

    return res.status(200).json({ message: 'OK' })
  } catch (err) {
    console.error('Webhook error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleEvent(event: WebhookEvent) {
  if (event.type === 'message' && event.message.type === 'text') {
    const text = event.message.text
    const userId = event.source.userId!

    await saveMessage(userId, text)

    let replyText = ''

    if (text.toLowerCase().includes('history') || text.toLowerCase().includes('履歴')) {
      const messages = await getUserMessages(userId, 5)
      if (messages.length > 0) {
        const historyText = messages.map((msg, index) => `${index + 1}. ${msg.message_text}`).join('\n')
        replyText = `最近のメッセージ履歴:\n${historyText}`
      } else {
        replyText = 'メッセージ履歴がありません。'
      }
    } else if (text.toLowerCase().includes('count') || text.toLowerCase().includes('カウント')) {
      const messages = await getUserMessages(userId, 1000)
      replyText = `これまでに ${messages.length} 件のメッセージを送信しています。`
    } else {
      replyText = `メッセージ「${text}」を保存しました！\n\n「history」で履歴を確認\n「count」でメッセージ数を確認`
    }

    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: replyText,
    })
  }
}
