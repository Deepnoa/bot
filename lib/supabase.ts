import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types
export interface LineMessage {
  id: string
  user_id: string
  message_text: string
  message_type: string
  timestamp: string
  created_at: string
}

// Save message to database
export async function saveMessage(userId: string, messageText: string, messageType = "text") {
  try {
    const { data, error } = await supabase.from("line_messages").insert([
      {
        user_id: userId,
        message_text: messageText,
        message_type: messageType,
        timestamp: new Date().toISOString(),
      },
    ])

    if (error) {
      console.error("Error saving message:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Database error:", error)
    return null
  }
}

// Get user message history
export async function getUserMessages(userId: string, limit = 50) {
  try {
    const { data, error } = await supabase
      .from("line_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching messages:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Database error:", error)
    return []
  }
}
