import { useEffect, useState } from "react"
import Head from "next/head"
import liff from "@line/liff"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Calendar, 
  MessageSquare, 
  Send, 
  CheckCircle, 
  Loader2,
  Sparkles
} from "lucide-react"

const formSchema = z.object({
  name: z.string().min(1, { message: "お名前を入力してください" }),
  datetime: z.string().min(1, { message: "希望日時を入力してください" }),
  detail: z.string().min(1, { message: "ご相談内容を入力してください" }),
})

type FormData = z.infer<typeof formSchema>

export default function LiffPage() {
  const [userId, setUserId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      datetime: "",
      detail: "",
    },
  })

  useEffect(() => {
    const init = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! })
        if (!liff.isLoggedIn()) {
          liff.login()
          return
        }
        const profile = await liff.getProfile()
        setUserId(profile.userId)
      } catch (err) {
        console.error("LIFF init error", err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch("/api/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...data }),
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        const e = await res.json()
        alert(e.error || "送信に失敗しました")
      }
    } catch (err) {
      console.error("submit error", err)
      alert("送信に失敗しました")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-800">読み込み中...</h2>
            <p className="text-gray-600">LINEアカウントを確認しています</p>
          </div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="w-24 h-24 mx-auto bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <div className="space-y-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              お問い合わせありがとうございました
            </h1>
            <p className="text-gray-600 max-w-sm mx-auto">
              ご入力いただいた内容を確認の上、担当者よりご連絡いたします。
            </p>
            <Badge variant="outline" className="px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              送信完了
            </Badge>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>お問い合わせフォーム - Deepnoa</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="container mx-auto px-4 py-8 max-w-lg">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <MessageSquare className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              お問い合わせ
            </h1>
            <p className="text-gray-600 mt-2">ご相談内容をお聞かせください</p>
          </div>

          {/* Form Card */}
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm animate-slide-up">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>お客様情報</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-2 text-gray-700">
                          <User className="w-4 h-4" />
                          <span>お名前</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="text" 
                            className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="山田太郎"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="datetime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-2 text-gray-700">
                          <Calendar className="w-4 h-4" />
                          <span>希望日時</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="datetime-local" 
                            className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="detail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-2 text-gray-700">
                          <MessageSquare className="w-4 h-4" />
                          <span>ご相談内容</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            rows={4} 
                            className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 resize-none"
                            placeholder="ご相談内容を詳しくお聞かせください..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    送信する
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-500 text-sm">
            <p>ご入力いただいた情報は適切に管理いたします。</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }
      `}</style>
    </>
  )
}
