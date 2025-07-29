import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { createClient } from '@supabase/supabase-js'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, User, FileText, CheckCircle, XCircle } from 'lucide-react'

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
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 flex items-center justify-center p-4">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-800">予約が見つかりません</h1>
          <p className="text-gray-600 max-w-sm">
            指定された予約IDは存在しないか、削除された可能性があります。
          </p>
        </div>
      </div>
    )
  }

  const reservationDate = new Date(reservation.datetime)
  const isToday = new Date().toDateString() === reservationDate.toDateString()
  const isPast = reservationDate < new Date()

  return (
    <>
      <Head>
        <title>予約確認 - {reservation.name}</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="container mx-auto px-4 py-8 max-w-lg">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              予約確認
            </h1>
            <p className="text-gray-600 mt-2">ご予約の詳細をご確認ください</p>
          </div>

          {/* Status Badge */}
          <div className="flex justify-center mb-6">
            <Badge 
              variant={isPast ? "destructive" : isToday ? "default" : "secondary"}
              className="px-4 py-2 text-sm font-medium"
            >
              {isPast ? "完了" : isToday ? "本日" : "予定"}
            </Badge>
          </div>

          {/* Main Card */}
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm animate-slide-up">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
              <div className="flex items-center space-x-3">
                <User className="w-6 h-6" />
                <CardTitle className="text-xl">{reservation.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Date & Time */}
              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">日時</p>
                  <p className="text-gray-700">
                    {reservationDate.toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long'
                    })}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-700">
                      {reservationDate.toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="flex items-start space-x-3 p-4 bg-purple-50 rounded-lg">
                <FileText className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">ご相談内容</p>
                  <p className="text-gray-700 leading-relaxed">{reservation.detail}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-500 text-sm">
            <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
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
