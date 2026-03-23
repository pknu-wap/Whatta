export type AssistantNewsBanner = {
  title: string
  body: string
  badge: string
}

export type AssistantQuickActionId = 'mypage' | 'traffic'

export type AssistantQuickAction = {
  id: AssistantQuickActionId
  title: string
  description: string
}

export type AssistantTransitStatus = {
  title: string
  routeLabel: string
  departureStatusLabel: string
  leaveByLabel: string
  summary: string
  ctaLabel: string
}

export type AssistantWeatherHighlight = {
  id: string
  label: string
  value: string
  tone: 'sunny' | 'rain' | 'wind' | 'dust' | 'neutral'
}

export type AssistantWeatherCard = {
  locationLabel: string
  headline: string
  currentTemperatureLabel: string
  highLowLabel: string
  comparedToYesterdayLabel: string
  conditionEmoji: string
  highlights: AssistantWeatherHighlight[]
  noPermissionMessage: string
  compactSummary: string
}

export type AssistantBriefingItem = {
  id: string
  title: string
  timeLabel: string
}

export type AssistantTaskSummary = {
  id: string
  title: string
  completed: boolean
  dueLabel: string
}

export type AssistantTopicSlide = {
  id: string
  title: string
  summary: string
  dueLabel: string
  completedCount: number
  totalCount: number
  tasks: AssistantTaskSummary[]
}

export type AssistantBriefing = {
  dateLabel: string
  summary: string
  schedules: AssistantBriefingItem[]
  todos: AssistantBriefingItem[]
}
