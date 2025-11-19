import messaging from '@react-native-firebase/messaging'
import { http } from '@/lib/http'
import { Alert, Linking } from 'react-native'
import { getInstallationId } from '@/lib/uuid'


export async function registerFcmToken(installationId: string) {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    console.log('푸시 알림 권한이 허용되지 않았습니다. :', authStatus);

    try {
      await http.post('/fcm/token', {
      fcmToken: null,
      enabled: false,
      platform: 'IOS',
    })
    console.log('서버로 알림 권한 상태 등록 성공')
  } catch (e) {
    console.log('서버로 알림 권한 상태 등록 실패', e)
  }
    return false
  }

  // 기기를 Apns에 등록
  try {
    await messaging().registerDeviceForRemoteMessages()
    console.log('registerDeviceForRemoteMessages 완료')
  } catch (e) {
    console.log('registerDeviceForRemoteMessages 실패', e)
    return false
  }

  // 1. 토큰 발급
  const token = await messaging().getToken()
  console.log('FCM token:', token) //토큰 잘 받아와지는 확인 로그

  // 2. 서버로 토큰 전송
  try {
    await http.post('/fcm/token', {
      fcmToken: token,
      platform: 'IOS', // 수정: 지금은 iOS만이니 하드코딩
    })
    console.log('서버로 FCM 토큰 등록 완료')
  } catch (e) {
    console.log('서버로 FCM 토큰 등록 실패', e)
  }

  // 3. 토큰 갱신 시 서버에 재등록
  messaging().onTokenRefresh(async (newToken) => {
    console.log('FCM token refreshed:', newToken)
    try {
      await http.post('/fcm/token', {
        fcmToken: newToken,
        platform: 'IOS',
      })
      console.log('서버로 새 FCM 토큰 등록 완료')
      Alert.alert('서버로 새 FCM 토큰 등록 완료')
    } catch (e) {
      console.log('새 FCM 토큰 등록 실패', e)
      Alert.alert('새 FCM 토큰 등록 실패')
    }
  })

  return true
}


//알림 스위치를 ON으로 바꿀 때 쓸 헬퍼
export async function ensureNotificationPermissionForToggle(): Promise<boolean> {

  const installationId = await getInstallationId()
  const ok = await registerFcmToken(installationId)

  if (ok) return true

   // 여기까지 왔다는 건 권한이 여전히 없는 상태
  Alert.alert( '알림 권한이 꺼져 있어요', '설정 > 알림에서 권한을 켜야 알림을 받을 수 있어요.',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '설정 열기',
          onPress: () => {
             Linking.openSettings()},
        },
      ],
    )

    return false
}
