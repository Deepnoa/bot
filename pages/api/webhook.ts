import type { NextApiRequest, NextApiResponse } from 'next'
import { Client, type WebhookEvent, validateSignature } from '@line/bot-sdk'

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

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const text = event.message.text.trim()
        if (text === '会社情報') {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '弊社のWebサイトはこちらです：https://deepnoa.com',
          })
        } else {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: `あなたは「${event.message.text}」と言いましたね`,
          })
        }
      }
    }

    return res.status(200).json({ message: 'OK' })
  } catch (err) {
    console.error('Webhook error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
