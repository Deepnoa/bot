import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end('Method Not Allowed')
  }

  try {
    const { count: totalMessages } = await supabase
      .from('line_messages')
      .select('*', { count: 'exact', head: true })

    const { data: uniqueUsersData } = await supabase
      .from('line_messages')
      .select('user_id')
      .group('user_id')

    const today = new Date().toISOString().split('T')[0]
    const { count: todayMessages } = await supabase
      .from('line_messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)

    const { data: recentMessages } = await supabase
      .from('line_messages')
      .select('id, user_id, message_text, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    return res.status(200).json({
      totalMessages: totalMessages || 0,
      uniqueUsers: uniqueUsersData?.length || 0,
      todayMessages: todayMessages || 0,
      recentMessages: recentMessages || [],
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
