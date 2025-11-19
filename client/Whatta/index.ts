import { registerRootComponent } from 'expo'
import messaging from '@react-native-firebase/messaging';

import App from './App'

//백그라운드 메세지 핸들러
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM] Background Message received:', remoteMessage);
});

registerRootComponent(App)
