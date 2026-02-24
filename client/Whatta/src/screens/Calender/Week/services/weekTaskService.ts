// api 호출, 페이로더 생성
type HttpClient = {
  get: (url: string, config?: any) => Promise<any>
  patch: (url: string, data?: any, config?: any) => Promise<any>
  post: (url: string, data?: any, config?: any) => Promise<any>
  delete: (url: string, config?: any) => Promise<any>
}

export function buildTaskUpdatePayload(task: any, overrides: Partial<any> = {}) {
  if (!task) return overrides

  const labels = Array.isArray(task.labels)
    ? task.labels
      .map((l: any) => (typeof l === 'number' ? l : (l.id ?? l.labelId ?? null)))
      .filter((id: any) => id !== null)
    : undefined

  const base: any = {
    title: task.title,
    content: task.content,
    completed: task.completed,
    placementDate: task.placementDate,
    placementTime: task.placementTime,
    dueDateTime: task.dueDateTime,
    sortNumber: task.sortNumber,
  }

  if (labels) base.labels = labels
  if (task.repeat) base.repeat = task.repeat
  if (task.endDate) base.endDate = task.endDate

  return {
    ...base,
    ...overrides,
  }
}

export async function updateTaskCompleted(
  http: HttpClient,
  taskId: string,
  nextCompleted: boolean,
  fallbackPlacementDate?: string,
) {
  const full = await http.get(`/task/${taskId}`)
  const fullTask = full.data.data
  const payload = buildTaskUpdatePayload(fullTask, {
    completed: nextCompleted,
    placementDate: fullTask?.placementDate ?? fallbackPlacementDate,
  })
  await http.patch(`/task/${taskId}`, payload)
  return fullTask
}

export async function moveTaskToDateTime(
  http: HttpClient,
  taskId: string,
  placementDate: string,
  placementTime: string,
) {
  const full = await http.get(`/task/${taskId}`)
  const task = full.data.data
  const payload = buildTaskUpdatePayload(task, {
    placementDate,
    placementTime,
  })
  await http.patch(`/task/${taskId}`, payload)
  return task
}

export async function cloneTaskToDateTimeAndDeleteOriginal(
  http: HttpClient,
  task: any,
  targetDate: string,
  placementTime: string | null,
) {
  const full = await http.get(`/task/${task.id}`)
  const baseTask = full.data.data

  const labelIds = Array.isArray(baseTask.labels)
    ? baseTask.labels
        .map((l: any) => (typeof l === 'number' ? l : (l.id ?? l.labelId ?? null)))
        .filter((id: any) => id !== null)
    : null

  const createPayload: any = {
    title: baseTask.title ?? task.title ?? '(제목 없음)',
    content: baseTask.content ?? '',
    labels: labelIds && labelIds.length ? labelIds : null,
    placementDate: targetDate,
    placementTime,
    dueDateTime: baseTask.dueDateTime ?? null,
    repeat: baseTask.repeat ?? null,
    endDate: baseTask.endDate ?? null,
    reminderNoti: baseTask.reminderNoti ?? null,
  }

  const createRes = await http.post('/task', createPayload)
  const created = createRes.data?.data

  if (!created?.id) {
    throw new Error('복제된 task 응답이 유효하지 않습니다.')
  }

  try {
    await http.delete(`/task/${task.id}`)
  } catch {
    // 복제 성공 후 원본 삭제 실패는 무시(기존 동작 유지)
  }

  return created
}
