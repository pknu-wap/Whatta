import { useEffect, useState } from 'react'

export default function useToday(format = 'YYYY-MM-DD') {
  const [text, setText] = useState(formatDate(new Date(), format))

  // 1분마다 날짜를 자동 갱신
  useEffect(() => {
    const timer = setInterval(() => {
      setText(formatDate(new Date(), format))
    }, 60 * 1000) // 1분마다
    return () => clearInterval(timer)
  }, [format])

  return text
}

// 날짜 포맷 함수
function formatDate(date: Date, format: string) {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const week = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]

  return format
    .replace('YYYY', date.getFullYear().toString())
    .replace('MM', pad(date.getMonth() + 1))
    .replace('DD', pad(date.getDate()))
    .replace('dd', week)
}
