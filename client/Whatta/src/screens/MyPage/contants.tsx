import type { MyPageStackList } from '@/navigation/MyPageStack'

export type MyItem = {
  key: string
  route: keyof MyPageStackList
}

export type MySection = {
  title?: string
  data: MyItem[]
  size?: 'normal' | 'small'
}

export const MY_SECTIONS: MySection[] = [
  {
    size: 'small',
    data: [{ key: '라벨 관리', route: 'Labels' }],
  },
  {
    title: '리마인드 알림 설정',
    data: [
      { key: '알림 시간 수정', route: 'NotifDefaults' },
      { key: '소리 및 진동', route: 'UsageReminders' },
    ],
  },
  {
    title: '교통 알림 설정',
    data: [
      { key: '알림 시간 수정', route: 'TrafficAlertsRoot' },
      { key: '소리 및 진동', route: 'Transitvibration' },
    ],
  },
  {
    title: '일정 요약 알림 설정',
    data: [
      { key: '알림 시간 수정', route: 'CalendarNotif' },
      { key: '소리 및 진동', route: 'CalendarVibration' },
    ],
  },
  {
    title: '메인화면 설정',
    data: [
      { key: '시작요일 설정', route: 'Preferences' },
      { key: '시작 페이지 설정', route: 'FirstPages' },
    ],
  },

  // 작은 카드
  {
    size: 'small',
    data: [{ key: '사용방법 안내', route: 'UsageReminders' }],
  },
]
