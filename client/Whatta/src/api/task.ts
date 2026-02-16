
import http from './client'

export const getTask = async (id: string) => {
  const res = await http.get(`/task/${id}`)
  return res.data.data
}

export const createTask = async (body: any) => {
  const res = await http.post('/task', body)
  return res.data.data
}

export const updateTask = async (id: string, body: any) => {
  const res = await http.patch(`/task/${id}`, body)
  return res.data.data
}

export const deleteTask = async (id: string) => {
  await http.delete(`/task/${id}`)
}