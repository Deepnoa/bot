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

    // LINE Flex Message 送信
    try {
      await lineClient.pushMessage(userId, {
        type: 'flex',
        altText: 'ご予約ありがとうございます！',
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: [
              {
                type: 'text',
                text: 'ご予約ありがとうございます！',
                weight: 'bold',
                size: 'md',
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                spacing: 'sm',
                contents: [
                  {
                    type: 'box',
                    layout: 'baseline',
                    spacing: 'sm',
                    contents: [
                      { type: 'text', text: '📛 お名前', color: '#aaaaaa', size: 'sm', flex: 1 },
                      { type: 'text', text: name, wrap: true, size: 'sm', flex: 5 },
                    ],
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    spacing: 'sm',
                    contents: [
                      { type: 'text', text: '📅 日時', color: '#aaaaaa', size: 'sm', flex: 1 },
                      { type: 'text', text: datetime, wrap: true, size: 'sm', flex: 5 },
                    ],
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    spacing: 'sm',
                    contents: [
                      { type: 'text', text: '📝 内容', color: '#aaaaaa', size: 'sm', flex: 1 },
                      { type: 'text', text: detail, wrap: true, size: 'sm', flex: 5 },
                    ],
                  },
                ],
              },
            ],
          },
        },
      })
    } catch (pushError) {
      console.error('LINE pushMessage error:', pushError)
    }

    return res.status(200).json({ status: 'ok' })
  } catch (err) {
    console.error('Reserve API error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
