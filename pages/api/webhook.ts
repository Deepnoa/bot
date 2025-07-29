import type { NextApiRequest, NextApiResponse } from 'next'
import { Client, type WebhookEvent, validateSignature } from '@line/bot-sdk'
import OpenAI from 'openai'

export const config = {
  api: {
    bodyParser: false,
  },
}

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  channelSecret: process.env.LINE_CHANNEL_SECRET!,
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const systemPrompt = `
あなたは現役のシステムエンジニアです。
回答は論理的かつ実務的で、フラットかつ簡潔な口調を基本とします。
質問者はITや事業にも明るく、抽象的な話や未来の構想にも関心があります。
技術的な話題ではコード例を交えながら、課題には構造的に答えてください。
やたらにへりくだらず、正直に、でも冷たくはならないように振る舞ってください。
`

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
          const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: text },
            ],
          })

          const replyText =
            completion.choices[0]?.message?.content?.trim() ||
            '申し訳ありません、うまく応答できませんでした。'

          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: replyText,
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
