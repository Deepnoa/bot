import type { NextApiRequest, NextApiResponse } from 'next'
import { Client, type WebhookEvent, validateSignature } from '@line/bot-sdk'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

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

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

async function insertMessage(
  userId: string,
  role: 'user' | 'assistant',
  message: string
): Promise<void> {
  const { error } = await supabase.from('chat_messages').insert({
    user_id: userId,
    role,
    message,
  })
  if (error) {
    console.error('insertMessage error:', error)
  }
}

async function getRecentMessages(
  userId: string,
  limit = 5
): Promise<{ role: string; content: string }[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, message, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('getRecentMessages error:', error)
    return []
  }

  return (data || []).map(m => ({
    role: m.role as string,
    content: m.message as string,
  }))
}

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
        const userId = event.source.userId!

        await insertMessage(userId, 'user', text)

        let replyText = ''

        if (text === '会社情報') {
          replyText = '弊社のWebサイトはこちらです：https://deepnoa.com'
        } else {
          const history = await getRecentMessages(userId)
          const messages = [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: text },
          ]

          const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages,
          })

          replyText =
            completion.choices[0]?.message?.content?.trim() ||
            '申し訳ありません、うまく応答できませんでした。'
        }

        await insertMessage(userId, 'assistant', replyText)

        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: replyText,
        })
      }
    }

    return res.status(200).json({ message: 'OK' })
  } catch (err) {
    console.error('Webhook error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
