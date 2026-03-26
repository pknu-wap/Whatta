import type {
  AssistantNewsBanner,
  AssistantTopicSlide,
} from '@/screens/Home/assistantHome/types'

export const assistantNews: AssistantNewsBanner = {
  slides: [
    {
      id: 'assistant-home',
      badge: 'NEW',
      title: '날씨와 오늘 요약',
      body: '일정과 할 일 브리핑을 한 화면에서 확인해요',
    },
    {
      id: 'ai-chat',
      badge: 'AI',
      title: 'AI가 바로 등록해줘요',
      body: '채팅으로 말하면 일정과 할 일을 바로 만들어요',
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
