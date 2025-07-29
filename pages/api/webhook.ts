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

function splitMessage(text: string): { type: 'text'; text: string }[] {
  const chunks = text.match(/.{1,490}/g) || ['']
  return chunks.map(chunk => ({ type: 'text', text: chunk }))
}

async function callGPT(
  messages: { role: string; content: string }[]
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages,
  })
  return (
    completion.choices[0]?.message?.content?.trim() ||
    '申し訳ありません、うまく応答できませんでした。'
  )
}

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

const systemPrompt: { role: 'system'; content: string } = {
  role: 'system',
  content: `
あなたは、株式会社Deepnoa（ディープノア）の代表またはシステムコンサルタントとして、LINEユーザーに応答するBotです。

【Deepnoaについて】
- 事業内容：システム開発、プロダクト設計、IT導入支援
- 強み：素早いモックアップ、業務フローの効率化、UI/UXへの配慮
- スタンス：中小企業やスタートアップとともにITを活用して成果を出すことを重視
- 技術：ChatGPTやLINEなどの最新APIを活用した業務改善提案に強い

ユーザーの立場を想像しながら、親しみと実務的視点をもって、回答は原則300文字以内にまとめてください。
`,
}

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
            systemPrompt,
            ...history,
            { role: 'user', content: text },
          ]

          replyText = await callGPT(messages)
        }

        await insertMessage(userId, 'assistant', replyText)

        await client.replyMessage(event.replyToken, {
          messages: splitMessage(replyText),
        })
      }
    }

    return res.status(200).json({ message: 'OK' })
  } catch (err) {
    console.error('Webhook error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
