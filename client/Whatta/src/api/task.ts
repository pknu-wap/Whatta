import { http } from '@/lib/http'

export interface TaskDTO {
  id: string
  title: string
  content?: string
  labels?: number[]
  completed?: boolean

  placementDate?: string | null
  placementTime?: string | null
  reminderNoti?: any | null   // 서버 타입에 맞게 나중에 구체화 가능
  dueDateTime?: string | null
}
export interface CreateTaskPayload {
  title: string
  content?: string
  labels?: number[]
  placementDate?: string | null
  placementTime?: string | null
  reminderNoti?: any | null
  date?: string
}

export interface UpdateTaskPayload {
  title?: string
  content?: string
  labels?: number[]
  completed?: boolean

  placementDate?: string | null
  placementTime?: string | null
  reminderNoti?: any | null

  fieldsToClear?: string[]
}

export async function getTask(taskId: string): Promise<TaskDTO> {
  const res = await http.get(`/task/${taskId}`)
  return res.data?.data
}

export async function updateTask(
  taskId: string,
  payload: UpdateTaskPayload,
): Promise<TaskDTO> {
  const res = await http.patch(`/task/${taskId}`, payload)
  return res.data?.data
}

export async function createTask(
  payload: CreateTaskPayload,
): Promise<TaskDTO> {
  const res = await http.post('/task', payload)
  return res.data?.data
}

export async function deleteTask(taskId: string): Promise<void> {
  await http.delete(`/task/${taskId}`)
}