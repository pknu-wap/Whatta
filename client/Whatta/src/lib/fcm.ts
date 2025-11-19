import messaging from '@react-native-firebase/messaging'
import { http } from '@/lib/http'
import { Alert } from 'react-native' // 임시(fcm 관련 확인용)

// FCM 토큰 발급 + 서버로 등록
export async function registerFcmToken(installationId: string) {
  // 수정: installationId 같이 받도록
  // 1. 권한 요청
  const authStatus = await messaging().requestPermission()
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL

  if (!enabled) {
    console.log('푸시 알림 권한이 허용되지 않았습니다.')
    return
  }

  try {
    // 기기를 Apns에 등록
    await messaging().registerDeviceForRemoteMessages()
    console.log('registerDeviceForRemoteMessages 완료')
  } catch (e) {
    console.log('registerDeviceForRemoteMessages 실패', e)
    return
  }

  // 2. 토큰 발급
  const token = await messaging().getToken()
  console.log('FCM token:', token) //토큰 잘 받아와지는 확인 로그
  Alert.alert('FCM 토큰', token ?? '토큰 없음')

  // 3. 서버로 토큰 전송
  try {
    await http.post('/fcm/token', {
      fcmToken: token,
      platform: 'IOS', // 수정: 지금은 iOS만이니 하드코딩
    })
    console.log('서버로 FCM 토큰 등록 완료')
    Alert.alert('서버로 FCM 토큰 등록 완료')
  } catch (e) {
    console.log('서버로 FCM 토큰 등록 실패', e)
    Alert.alert('서버로 FCM 토큰 등록 실패')
  }

  // 4. 토큰 갱신 시 서버에 재등록
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
}
