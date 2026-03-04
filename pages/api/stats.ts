import type { NextApiRequest, NextApiResponse } from "next"
import { query } from "@/lib/postgres"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET")
    return res.status(405).end("Method Not Allowed")
  }

  try {
    const totalResult = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM line_messages`
    )

    const uniqueUsersResult = await query<{ count: string }>(
      `SELECT COUNT(DISTINCT user_id)::text AS count FROM line_messages`
    )

    const todayResult = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM line_messages
       WHERE created_at >= date_trunc(day, NOW())
         AND created_at < date_trunc(day, NOW()) + interval 1 day`
    )

    const recentMessagesResult = await query<{
      id: number
      user_id: string
      message_text: string
      created_at: string
    }>(
      `SELECT id, user_id, message_text, created_at
       FROM line_messages
       ORDER BY created_at DESC
       LIMIT 10`
    )

    return res.status(200).json({
      totalMessages: Number(totalResult.rows[0]?.count ?? 0),
      uniqueUsers: Number(uniqueUsersResult.rows[0]?.count ?? 0),
      todayMessages: Number(todayResult.rows[0]?.count ?? 0),
      recentMessages: recentMessagesResult.rows,
    })
  } catch (error) {
    console.error("Stats API error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
