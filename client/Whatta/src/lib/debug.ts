export function logToken(label: string, access?: string | null, refresh?: string | null) {
  if (!__DEV__) return // 개발 모드에서만
  // 터미널로 출력
  console.log(
    `[AUTH:${label}] access=${access ?? '(empty)'}\nrefresh=${refresh ?? '(empty)'}`,
  )
}
