import { http } from '@/lib/http'

export type Label = { id: number; title: string; colorKey: string }

type GetLabelsRes = {
  statuscode: string
  message: string
  data: { labels: Label[] }
}

type CreateLabelRes = {
  statuscode: string
  message: string
  data: Label // { id, title, colorKey }
}

export async function getMyLabels(): Promise<Label[]> {
  const { data } = await http.get<GetLabelsRes>('/api/user/setting/label')
  //서버 응답 그대로 사용 (data.labels)
  return data?.data?.labels ?? []
}

export async function createLabel(title: string, colorKey: string): Promise<Label> {
  const { data } = await http.post<CreateLabelRes>('/api/user/setting/label', { title, colorKey })
  return data.data
}
