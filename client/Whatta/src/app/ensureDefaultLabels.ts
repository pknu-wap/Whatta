// import { http } from '@/lib/http'

// const LABEL_BASE = '/api/user/setting/label'
// const DEFAULTS = ['일정', '테스크'] as const

// type LabelDTO = { id: string | number; title: string }

// export async function ensureDefaultLabels() {
//   try {
//     const res = await http.get(LABEL_BASE)
//     const list: LabelDTO[] = Array.isArray(res.data) ? res.data : (res.data?.data ?? [])

//     const has = new Set(list.map((d) => d.title.trim()))
//     const missing = DEFAULTS.filter((t) => !has.has(t))

//     for (const title of missing) {
//       await http.post(LABEL_BASE, { title }) // idempotent 이미 있으면 서버가 409를 줄 수도 있음
//     }
//   } catch (e) {
//     // 부트스트랩 실패해도 앱이 멈추면 안되므로 로그만
//     console.warn('[ensureDefaultLabels] failed:', e)
//   }
// }
