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
  data: Label
}

export async function getMyLabels(): Promise<Label[]> {
  const { data } = await http.get<GetLabelsRes>('/user/setting/label')
  return data?.data?.labels ?? []
}

export async function createLabel(title: string): Promise<Label> {
  const { data } = await http.post<CreateLabelRes>('/user/setting/label', {
    title,
  })
  return data.data
}

export async function updateLabel(id: number, title: string) {
  await http.put(`/user/setting/label/${id}`, { title })
}

export async function deleteLabels(ids: number[]) {
  return http.request({
    method: 'DELETE',
    url: '/user/setting/label',
    data: ids,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
