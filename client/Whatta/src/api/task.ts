import { http } from '@/lib/http'

export async function getTask(taskId: string) {
  const res = await http.get(`/task/${taskId}`)
  return res.data?.data
}

export async function updateTask(taskId: string, payload: any) {
  return http.patch(`/task/${taskId}`, payload)
}

export async function createTask(payload: any) {
  const res = await http.post('/task', payload)
  return res.data?.data
}

export async function deleteTask(taskId: string) {
  return http.delete(`/task/${taskId}`)
}