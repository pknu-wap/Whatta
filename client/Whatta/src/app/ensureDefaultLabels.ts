import { http } from '@/lib/http'

const LABEL_BASE = '/api/user/setting/label'
const DEFAULTS = ['일정', '할 일'] as const

type LabelDTO = { id: string | number; title: string }

export async function ensureDefaultLabels() {
  try {
    const res = await http.get(LABEL_BASE)

    // Swagger: res.data.data.labels
    const labels = res.data?.data?.labels
    const list: LabelDTO[] = Array.isArray(labels) ? labels : []

    const has = new Set(list.map((d) => d.title.trim()))
    const missing = DEFAULTS.filter((t) => !has.has(t))

    for (const title of missing) {
      await http.post(LABEL_BASE, { title })
    }
  } catch (e) {
    console.warn('[ensureDefaultLabels] failed:', e)
  }
}
