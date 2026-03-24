import type {
  AssistantBriefing,
  AssistantNewsBanner,
  AssistantQuickAction,
  AssistantTaskBriefing,
  AssistantTransitStatus,
  AssistantTopicSlide,
  AssistantWeatherCard,
} from '@/screens/Home/assistantHome/types'

export const assistantNews: AssistantNewsBanner = {
  badge: '왓타 소식',
  title: '새 학기 비서홈 초안',
  body: '배너, 빠른 액션, 오늘 브리핑, 주제별 슬라이드까지 한 화면에서 볼 수 있게 구조를 먼저 잡았습니다.',
}

export const assistantQuickActions: AssistantQuickAction[] = [
]

export const assistantTransitStatus: AssistantTransitStatus = {
  title: '교통 알림',
  routeLabel: '14:00 팀 프로젝트 회의 · 학생회관',
  departureStatusLabel: '12:55에 출발하면 여유 있어요',
  leaveByLabel: '출발까지 38분',
  summary: '지금 기준 버스 2정거장 여유가 있고, 도보 8분 포함 경로예요.',
  ctaLabel: '교통알림 페이지 이동',
}

export const assistantWeather: AssistantWeatherCard = {
  locationLabel: '지금 있는 곳 기준',
  headline: '현재는 맑지만 오후 4시에 비 소식이 있어요. 우산 챙기세요.',
  compactSummary: '오후 4시에 비 소식',
  currentTemperatureLabel: '현재 17도',
  feelsLikeLabel: '체감 15도',
  highLowLabel: '최고 21도 · 최저 15도',
  conditionEmoji: '☀️',
  conditionLabel: '맑음',
  weatherTheme: 'sunny',
  dustGradeLabel: '좋음',
  dustDetailLabel: '공기가 맑은 편이에요',
  noPermissionMessage: '위치 권한이 없으면 오늘 하루도 힘내세요 메시지로 대체할 수 있어요.',
  highlights: [
    {
      id: 'rain',
      label: '강수 예보',
      value: '오후 4시에 비 와요 ☔',
      tone: 'rain',
    },
    {
      id: 'temp',
      label: '기온',
      value: '최고 21도, 최저 15도',
      tone: 'sunny',
    },
    {
      id: 'wind',
      label: '바람',
      value: '저녁에 바람이 강해져요',
      tone: 'wind',
    },
    {
      id: 'dust',
      label: '미세먼지',
      value: '좋음 🍀',
      tone: 'dust',
    },
  ],
}

export const assistantBriefing: AssistantBriefing = {
  dateLabel: '2026.03.24 (화)',
  schedules: [
    { id: 's1', title: '친구랑 약속', timeLabel: '#4E7CF3' },
    { id: 's2', title: '교수님 미팅', timeLabel: '#B357FF' },
  ],
  timeline: [
    {
      id: 't1',
      title: '교수님 미팅',
      timeRange: '09:00 ~ 10:00',
      accentColor: '#A7B0B8',
      status: 'past',
    },
    {
      id: 't2',
      title: '점심 약속',
      timeRange: '11:00 ~ 12:00',
      accentColor: '#B357FF',
      status: 'current',
    },
    {
      id: 't3',
      title: '과제',
      timeRange: '13:00 ~ 15:00',
      accentColor: '#A7B0B8',
      status: 'upcoming',
    },
  ],
}

export const assistantTaskBriefing: AssistantTaskBriefing = {
  dateLabel: '2026.03.24 (화)',
  tasks: [
    { id: 'task-1', title: '회의록 정리', completed: false, dueLabel: 'D-3' },
    { id: 'task-2', title: '발표 자료 제출', completed: true, dueLabel: 'D-day' },
  ],
  timeline: [
    {
      id: 'task-t1',
      title: '교수님 미팅 준비',
      timeRange: '09:00 ~ 10:00',
      completed: true,
      dueLabel: 'D-3',
    },
    {
      id: 'task-t2',
      title: '점심 전 자료 점검',
      timeRange: '11:00 ~ 12:00',
      completed: false,
      dueLabel: 'D-day',
    },
    {
      id: 'task-t3',
      title: '문서 마무리',
      timeRange: '13:00 ~ 15:00',
      completed: false,
      dueLabel: 'D-1',
    },
  ],
}

export const assistantTopicSlides: AssistantTopicSlide[] = [
  {
    id: 'semester',
    title: '새 학기 준비',
    summary: '수강, 과제, 일정 정리 태스크 요약',
    dueLabel: '이번 주',
    completedCount: 2,
    totalCount: 4,
    tasks: [
      { id: 'semester-1', title: '시간표 OCR 등록', completed: true, dueLabel: '완료' },
      { id: 'semester-2', title: '과목별 일정 정리', completed: false, dueLabel: '3/25' },
      { id: 'semester-3', title: '강의실 이동 시간 체크', completed: false, dueLabel: '3/26' },
      { id: 'semester-4', title: '교통알림 세팅', completed: true, dueLabel: '완료' },
    ],
  },
  {
    id: 'team-project',
    title: '팀플 일정',
    summary: '주간 미팅과 산출물 마감 확인',
    dueLabel: 'D-2',
    completedCount: 1,
    totalCount: 3,
    tasks: [
      { id: 'team-1', title: '회의 아젠다 정리', completed: true, dueLabel: '완료' },
      { id: 'team-2', title: '디자인 시안 피드백', completed: false, dueLabel: '3/24' },
      { id: 'team-3', title: '최종 발표 리허설', completed: false, dueLabel: '3/25' },
    ],
  },
  {
    id: 'personal',
    title: '개인 루틴',
    summary: '생활 루틴과 반복 태스크 추적',
    dueLabel: '매일',
    completedCount: 3,
    totalCount: 5,
    tasks: [
      { id: 'personal-1', title: '아침 브리핑 확인', completed: true, dueLabel: '완료' },
      { id: 'personal-2', title: '운동 일정 기록', completed: true, dueLabel: '완료' },
      { id: 'personal-3', title: '다음 날 준비물 체크', completed: false, dueLabel: '22:00' },
      { id: 'personal-4', title: '식단 메모 작성', completed: true, dueLabel: '완료' },
      { id: 'personal-5', title: '취침 전 할 일 정리', completed: false, dueLabel: '23:00' },
    ],
  },
]
