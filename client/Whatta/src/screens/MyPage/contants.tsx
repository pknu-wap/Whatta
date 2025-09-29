import type { MyPageStackList } from '@/navigation/MyPageStack'

export type MyItem = {
  key: string
  route: keyof MyPageStackList
  desc?: string
}

export type MySection = {
  title: string
  data: MyItem[]
}

export const MY_SECTIONS: MySection[] = [
  {
    title: '계정',
    data: [{ key: '프로필', route: 'Profile', desc: '사진/이름/나이(직업)' }],
  },
  {
    title: '환경설정',
    data: [
      {
        key: '시작 요일 / 메인화면',
        route: 'Preferences',
        desc: '월/일 시작, 앱 시작 화면',
      },
      {
        key: '사용방법 리마인드',
        route: 'UsageReminders',
        desc: '온보딩/튤팁 다시 보기',
      },
      {
        key: '리마인드 기본값',
        route: 'NotifDefaults',
        desc: '리마인드 알림 재설정, 소리/진동',
      },
    ],
  },
  {
    title: '기능',
    data: [
      { key: 'OCR 시간표 등록', route: 'OCRWizard', desc: '촬영/갤러리 -> 인식' },
      { key: '교통 알림', route: 'TransitAlerts', desc: '정류장/지하철 도착 알림' },
    ],
  },
]
