import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { Client as LineClient } from '@line/bot-sdk'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

const lineClient = new LineClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
})

interface ReserveBody {
  userId: string
  name: string
  datetime: string
  detail: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }

  try {
    const { userId, name, datetime, detail } = req.body as ReserveBody

    if (!userId || !name || !datetime || !detail) {
      return res.status(400).json({ error: 'missing fields' })
    }

    const { error } = await supabase.from('inquiries').insert({
      user_id: userId,
      name,
      datetime,
      detail,
    })

    if (error) {
      console.error('Reserve insert error:', error)
      return res.status(500).json({ error: error.message })
    }

    // LINEメッセージ送信
    try {
      await lineClient.pushMessage(userId, {
        type: 'text',
        text: `\u{1F4DD} ご予約ありがとうございます！\n\n📛 お名前: ${name}\n📅 日時: ${datetime}\n📝 内容: ${detail}`,
      })
    } catch (pushError) {
      console.error('LINE pushMessage error:', pushError)
      // 通知失敗してもエラーにはしない
    }

    return res.status(200).json({ status: 'ok' })
  } catch (err) {
    console.error('Reserve API error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
