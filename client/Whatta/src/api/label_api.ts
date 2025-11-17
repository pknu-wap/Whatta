import { http } from '@/lib/http'

export type Label = { id: number; title: string }

type GetLabelsRes = {
  statuscode: string
  message: string
  data: { labels: Label[] }
}

type CreateLabelRes = {
  statuscode: string
  message: string
  data: Label // { id, title }
}

export async function getMyLabels(): Promise<Label[]> {
  const { data } = await http.get<GetLabelsRes>('/api/user/setting/label')
  return data?.data?.labels ?? []
}

export async function createLabel(title: string): Promise<Label> {
  const { data } = await http.post<CreateLabelRes>('/api/user/setting/label', {
    title,
  })
  return data.data
}
