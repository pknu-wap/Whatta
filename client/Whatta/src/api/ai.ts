import { http } from '@/lib/http'

export type AiImagePayload = {
  format: string
  data: string
  url: string
  objectKey?: string | null
}

export type AiChatImageRequest = {
  objectKey: string
}

export type AiRepeatUnit = 'DAY' | 'WEEK' | 'MONTH'

export type AiRepeat = {
  interval: number | null
  unit: AiRepeatUnit | null
  on: string[] | null
  endDate: string | null
  exceptionDates?: string[] | null
}

export type AiWarnings = Record<string, string[] | null> | null

export type AiScheduleDraft = {
  isScheduled?: boolean
  isEvent: boolean
  title: string
  startDate: string | null
  endDate: string | null
  startTime: string | null
  endTime: string | null
  dueDateTime: string | null
  repeat: AiRepeat | null
  warnings: AiWarnings
}

export type AiChatData = {
  freeCount?: number
  message: string
  schedules: AiScheduleDraft[] | null
}

export type AiChatResponse = {
  statusCode: string
  message: string
  data: AiChatData
}

export type AiChatRequest = {
  text: string
  image: AiChatImageRequest | null
}

const AI_CHAT_PATH = '/ai'

export async function requestAiChat(payload: AiChatRequest): Promise<AiChatResponse> {
  const { data } = await http.post<AiChatResponse>(AI_CHAT_PATH, payload)
  return data
}
