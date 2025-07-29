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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-bold">お問い合わせありがとうございました</h1>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>お問い合わせフォーム</title>
      </Head>
      <div className="p-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-center">お問い合わせ</h1>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>お名前</FormLabel>
                  <FormControl>
                    <Input {...field} type="text" />
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
                  <FormLabel>希望日時</FormLabel>
                  <FormControl>
                    <Input {...field} type="datetime-local" />
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
                  <FormLabel>ご相談内容</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">送信</Button>
          </form>
        </Form>
      </div>
    </>
  )
}
