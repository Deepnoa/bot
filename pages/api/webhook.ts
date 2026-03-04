import type { NextApiRequest, NextApiResponse } from 'next'
import { Client, type WebhookEvent, validateSignature } from '@line/bot-sdk'
import fetch from 'node-fetch'
import { createClient } from '@supabase/supabase-js'

export const config = {
  api: {
    bodyParser: false,
  },
}

console.log("LINE_CHANNEL_ACCESS_TOKEN exists", Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN))
console.log("LINE_CHANNEL_SECRET exists", Boolean(process.env.LINE_CHANNEL_SECRET))

const ollamaUrl = process.env.OLLAMA_URL || 'http://192.168.11.11:11434/api/chat';

async function callOllama(
  messages: { role: string; content: string }[]
): Promise<string> {
  const payload = { model: MODEL, messages: messages.map(m => ({ role: m.role, content: m.content })), stream: false };
  const res = await fetch(ollamaUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('Ollama error:', err);
    return '申し訳ありません、うまく応答できませんでした。';
  }
  const data = await res.json();
  return data.message?.content?.trim() || '応答がありませんでした。';
}

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  channelSecret: process.env.LINE_CHANNEL_SECRET!,
})

const systemPrompt: { role: 'system'; content: string } = {
  role: 'system',
  content: `
あなたは株式会社DeepnoaのAIアシスタントです。
ユーザーの相談に対して、やさしく・わかりやすく・カジュアルに、原則150文字以内、1〜2文で返答してください。回答は150文字程度でまとめてください。
難しい言葉は避け、ユーザーの直前の発言にフォーカスして会話の流れを意識してください。
`,
}

    .select('role, message, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit * 2)

  if (error) {
    console.error('getRecentMessages error:', error)
    return []
  }

  const rawMessages = (data || []).map(m => ({
    role: m.role as string,
    content: m.message as string,
  }))

  const history: { role: string; content: string }[] = []
  let lastRole: string | null = null
  for (const msg of rawMessages) {
    if (lastRole && lastRole === msg.role) continue
    history.push(msg)
    lastRole = msg.role
    if (history.length >= limit) break
  }

  return history
}

function splitMessage(text: string): { type: 'text'; text: string }[] {
  const chunks = text.match(/.{1,490}/g) || ['']
  return chunks.map(chunk => ({ type: 'text', text: chunk }))
}

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
          const history = await getRecentMessages(userId, 4)
          const messages = [
            systemPrompt,
            ...history,
            { role: 'user', content: text },
          ]

          replyText = await callOllama(messages)
        }

        await insertMessage(userId, 'assistant', replyText)

        const replyMessages = splitMessage(replyText)
        try {
          await client.replyMessage(event.replyToken, replyMessages)
        } catch (err) {
          console.error('❌ LINE返信エラー:', err)
        }
      }
    }

    return res.status(200).json({ message: 'OK' })
  } catch (err) {
    console.error('Webhook error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
