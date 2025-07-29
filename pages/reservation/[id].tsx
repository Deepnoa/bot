import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { createClient } from '@supabase/supabase-js'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface Reservation {
  name: string
  datetime: string
  detail: string
}

interface Props {
  reservation: Reservation | null
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const { id } = context.params as { id: string }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('inquiries')
    .select('name, datetime, detail')
    .eq('id', id)
    .single()

  if (error || !data) {
    return { props: { reservation: null } }
  }

  return { props: { reservation: data } }
}

export default function ReservationPage({ reservation }: Props) {
  if (!reservation) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">存在しない予約です。</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>予約確認</title>
      </Head>
      <div className="p-4 max-w-md mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-center">予約内容</h1>
        <Card>
          <CardHeader>
            <CardTitle>{reservation.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <strong>日時:</strong>{' '}
              {new Date(reservation.datetime).toLocaleString('ja-JP')}
            </p>
            <p>
              <strong>内容:</strong> {reservation.detail}
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
