import { http } from '@/lib/http'
import { token } from '@/lib/token'
import { createLabel } from '@/api/label_api'

//이 파일은 중간발표에 라벨 필터링 모달 시연을 위해서 임시로 생성함
//이후에 삭제!
type Label = { id: number; title: string; colorKey?: string }

export async function ensureDefaultLabels() {
  const defaults = [
    { title: '약속', colorKey: 'FF3B30' },
    { title: '동아리', colorKey: '34C759' },
    { title: '수업', colorKey: '007AFF' },
    { title: '과제', colorKey: 'AF52DE' },
  ]

  for (const d of defaults) {
    try {
      await createLabel(d.title, d.colorKey)
    } catch {
      // 서버가 중복(이미 존재) 라벨은 알아서 무시하므로 별도 처리 필요 없음
    }
  }
}