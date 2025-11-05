import type { MyPageStackList } from '@/navigation/MyPageStack'

export type MyItem = {
  key: string
  route: keyof MyPageStackList
  desc?: string
}

export type MySection = {
  title?: string
  data: MyItem[]
  size?: 'normal' | 'small'
}

export const MY_SECTIONS: MySection[] = [
  {
    title: '메인화면 설정',
    data: [
      { key: '시작 요일 설정', route: 'Preferences' },
      { key: '시작 페이지 설정', route: 'Preferences' },
    ],
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
      { key: '알림 시간 수정', route: 'TransitAlerts' },
      { key: '??', route: 'TransitAlerts' },
    ],
  },

  // 작은 카드
  {
    size: 'small',
    data: [{ key: '사진으로 시간표 등록', route: 'OCRWizard' }],
  },
  {
    size: 'small',
    data: [{ key: '사용방법 안내', route: 'UsageReminders' }],
  },
]
