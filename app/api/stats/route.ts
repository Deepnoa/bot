import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Get total messages count
    const { count: totalMessages } = await supabase.from("line_messages").select("*", { count: "exact", head: true })

    // Get unique users count
    const { data: uniqueUsersData } = await supabase.from("line_messages").select("user_id").group("user_id")

    // Get today's messages count
    const today = new Date().toISOString().split("T")[0]
    const { count: todayMessages } = await supabase
      .from("line_messages")
      .select("*", { count: "exact", head: true })
      .gte("created_at", `${today}T00:00:00.000Z`)
      .lt("created_at", `${today}T23:59:59.999Z`)

    // Get recent messages
    const { data: recentMessages } = await supabase
      .from("line_messages")
      .select("id, user_id, message_text, created_at")
      .order("created_at", { ascending: false })
      .limit(10)

    return NextResponse.json({
      totalMessages: totalMessages || 0,
      uniqueUsers: uniqueUsersData?.length || 0,
      todayMessages: todayMessages || 0,
      recentMessages: recentMessages || [],
    })
  } catch (error) {
    console.error("Stats API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
