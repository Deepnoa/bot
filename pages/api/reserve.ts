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

    console.log('Reserve request userId:', userId)

    if (!userId || !name || !datetime || !detail) {
      return res.status(400).json({ error: 'missing fields' })
    }

    const { data, error } = await supabase
      .from('inquiries')
      .insert({
        user_id: userId,
        name,
        datetime,
        detail,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Reserve insert error:', error)
      return res.status(500).json({ error: error.message })
    }

    const useText = process.env.LINE_USE_TEXT_MESSAGE === 'true'
    const reservationUrl = `https://line-bot-webhook-ten.vercel.app/reservation/${data.id}`

    const message = useText
      ? {
          type: 'text' as const,
          text: 'ご予約ありがとうございます！',
        }
      : {
          type: 'flex' as const,
          altText: 'ご予約ありがとうございます！',
          contents: {
            type: 'bubble',
            hero: {
              type: 'image',
              url: 'https://line-bot-webhook-ten.vercel.app/calender-image.png',
              size: 'full',
              aspectRatio: '20:13',
              aspectMode: 'cover',
            },
            body: {
              type: 'box',
              layout: 'vertical',
              spacing: 'md',
              contents: [
                {
                  type: 'text',
                  text: 'ご予約ありがとうございます！',
                  weight: 'bold',
                  size: 'xl',
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
                        { type: 'text', text: 'お名前', color: '#aaaaaa', size: 'sm', flex: 1 },
                        { type: 'text', text: name, wrap: true, color: '#666666', size: 'sm', flex: 5 },
                      ],
                    },
                    {
                      type: 'box',
                      layout: 'baseline',
                      spacing: 'sm',
                      contents: [
                        { type: 'text', text: '日時', color: '#aaaaaa', size: 'sm', flex: 1 },
                        { type: 'text', text: datetime, wrap: true, color: '#666666', size: 'sm', flex: 5 },
                      ],
                    },
                    {
                      type: 'box',
                      layout: 'baseline',
                      spacing: 'sm',
                      contents: [
                        { type: 'text', text: '内容', color: '#aaaaaa', size: 'sm', flex: 1 },
                        { type: 'text', text: detail, wrap: true, color: '#666666', size: 'sm', flex: 5 },
                      ],
                    },
                  ],
                },
              ],
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                {
                  type: 'button',
                  style: 'link',
                  height: 'sm',
                  action: {
                    type: 'uri',
                    label: '詳細を見る',
                    uri: reservationUrl,
                  },
                },
                { type: 'spacer', size: 'sm' },
              ],
              flex: 0,
            },
            styles: {
              footer: {
                separator: true,
              },
            },
          },
        }

    console.log('Sending LINE message. textMode:', useText)

    try {
      await lineClient.pushMessage(userId, message)
      console.log('pushMessage success')
    } catch (pushError: any) {
      console.error('LINE pushMessage error:', pushError)
      console.error('status:', pushError?.response?.status)
      console.error('data:', pushError?.response?.data)
    }

    return res.status(200).json({ status: 'ok', id: data.id })
  } catch (err) {
    console.error('Reserve API error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
