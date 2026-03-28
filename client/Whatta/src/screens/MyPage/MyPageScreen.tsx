import React, { useLayoutEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable, type ViewStyle } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import Constants from 'expo-constants'
import type { MyPageStackList } from '@/navigation/MyPageStack'
import colors from '@/styles/colors'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { bus } from '@/lib/eventBus'
import LeftIcon from '@/assets/icons/left.svg'
import RightIcon from '@/assets/icons/right.svg'
import AddImageSheet from '@/screens/More/AddImageSheet'
import OCREventCardSlider from '@/screens/More/OcrEventCardSlider'
import { useOCR } from '@/hooks/useOCR'
import OcrSplash from '@/screens/More/OcrSplash'
import {
  getActiveScheduleColorSetId,
  SCHEDULE_COLOR_SET_IDS,
  setActiveScheduleColorSetId,
} from '@/styles/scheduleColorSets'
import { ts } from '@/styles/typography'

type Props = NativeStackScreenProps<MyPageStackList, 'MyPageList'>

function MenuCard({
  label,
  onPress,
  style,
}: {
  label: string
  onPress: () => void
  style?: ViewStyle
}) {
  return (
    <Pressable style={({ pressed }) => [S.menuCard, pressed && S.menuCardPressed, style]} onPress={onPress}>
      <Text style={S.menuCardText}>{label}</Text>
    </Pressable>
  )
}

function SimpleHeader({
  canGoBack,
  onPressBack,
}: {
  canGoBack: boolean
  onPressBack: () => void
}) {
  const insets = useSafeAreaInsets()
  return (
    <View style={{ backgroundColor: colors.background.bg1 }}>
      <View style={{ height: insets.top }} />
      <View
        style={{
          height: 48,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background.bg1,
        }}
      >
        {canGoBack ? (
          <Pressable
            onPress={onPressBack}
            style={({ pressed }) => [S.backButton, pressed && S.backButtonPressed]}
            hitSlop={10}
          >
            {({ pressed }) => (
              <LeftIcon
                width={24}
                height={24}
                color={pressed ? colors.icon.selected : colors.icon.default}
              />
            )}
          </Pressable>
        ) : null}
        <Text style={{ ...ts('titleM'), fontSize: 20, color: colors.text.text1 }}>마이페이지</Text>
      </View>
    </View>
  )
}

export default function MyPageScreen({ navigation }: Props) {
  const variant = String(Constants.expoConfig?.extra?.variant ?? 'unknown').toUpperCase()
  const apiBaseUrl = String(Constants.expoConfig?.extra?.apiBaseUrl ?? '')
  const serverLabel = apiBaseUrl.includes('-dev-') ? 'DEV' : 'PROD'
  const showEnvBadge = variant === 'DEV' || serverLabel === 'DEV'
  const showColorSetChip = showEnvBadge
  const [activeColorSet, setActiveColorSet] = useState(getActiveScheduleColorSetId())
  const topMenuItems: { label: string; route: keyof MyPageStackList }[] = [
    { label: '일정 색상 변경', route: 'Preferences' },
    { label: '시간표 추가하기', route: 'vibration' },
    { label: '라벨 관리', route: 'Labels' },
  ]
  const notificationItems: { label: string; route: keyof MyPageStackList }[] = [
    { label: '리마인드 알림 시간 수정', route: 'NotifDefaults' },
    { label: '일정 요약 알림 설정', route: 'CalendarNotif' },
  ]

  const nextColorSet = useMemo(() => {
    const idx = SCHEDULE_COLOR_SET_IDS.indexOf(activeColorSet)
    return SCHEDULE_COLOR_SET_IDS[(idx + 1) % SCHEDULE_COLOR_SET_IDS.length]
  }, [activeColorSet])

  const onPressColorSetChip = () => {
  const changed = setActiveScheduleColorSetId(nextColorSet)
  setActiveColorSet(changed)
  bus.emit('scheduleColorSet:changed', { setId: changed })
  }

  const [showOcrSheet, setShowOcrSheet] = useState(false)
  const {
    ocrSplashVisible,
    ocrModalVisible,
    ocrEvents,
    setOcrModalVisible,
    sendToOCR,
  } = useOCR()

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerShadowVisible: false,
      header: () => (
        <SimpleHeader
          canGoBack={navigation.canGoBack()}
          onPressBack={() => navigation.goBack()}
        />
      ),
    })
  }, [navigation])

  const onPressMyItem = (route: keyof MyPageStackList) => {
    if (route === 'Preferences') {
      onPressColorSetChip()
      return
    }

    if (route === 'vibration') {
      setShowOcrSheet(true)
      return
    }

    navigation.navigate(route)
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.bg1 }}>
      <ScrollView
        style={{ backgroundColor: colors.background.bg1 }}
        contentContainerStyle={S.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        scrollIndicatorInsets={{ top: 0, bottom: 120, left: 0, right: 0 }}
      >
        <View style={S.profileCard}>
          <View style={S.avatar} />
          <View style={S.profileContent}>
            <View style={S.profileMainRow}>
              <View style={S.profileNameRow}>
                <Text style={S.profileName}>사용자님</Text>
                <RightIcon width={24} height={24} color="#B4B4B4" />
              </View>
              {showEnvBadge ? (
                <View style={S.profileBadgeRow}>
                  <View style={[S.envBadge, S.envBadgeDev]}>
                    <Text style={S.envBadgeText}>{`${variant}/${serverLabel}`}</Text>
                  </View>
                  {showColorSetChip ? (
                    <Pressable style={[S.envBadge, S.colorSetBadge]} onPress={onPressColorSetChip}>
                      <Text style={S.envBadgeText}>{`SET:${activeColorSet}`}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {topMenuItems.map((item, index) => (
          <MenuCard
            key={item.route}
            label={item.label}
            onPress={() => onPressMyItem(item.route)}
            style={index === 0 ? undefined : S.menuCardSpacing}
          />
        ))}

        <Text style={S.sectionLabel}>알림 시간 설정</Text>

        <View style={S.notificationGroup}>
          {notificationItems.map((item, index) => (
            <Pressable
              key={item.route}
              style={[S.menuCard, index === 0 ? null : S.menuCardSpacing]}
              onPress={() => onPressMyItem(item.route)}
            >
              <Text style={S.menuCardText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <AddImageSheet
        visible={showOcrSheet}
        onClose={() => setShowOcrSheet(false)}
        onPickImage={async (_uri, base64, ext) => {
          setShowOcrSheet(false)
          await sendToOCR(base64, ext)
        }}
        onTakePhoto={async (_uri, base64, ext) => {
          setShowOcrSheet(false)
          await sendToOCR(base64, ext)
        }}
      />
      <OcrSplash visible={ocrSplashVisible} />

      <OCREventCardSlider
        visible={ocrModalVisible}
        events={ocrEvents}
        onClose={() => {
          setOcrModalVisible(false)
        }}
        onAddEvent={(ev) => {
          console.log('[OCR saved event]', ev)
        }}
        onSaveAll={() => {
          console.log('[OCR save all complete]')
        }}
      />
    </View>
  )
}

const S = StyleSheet.create({
  backButton: {
    position: 'absolute',
    left: 16,
    top: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    opacity: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 40,
    alignItems: 'center',
  },
  menuCard: {
    width: 358,
    height: 56,
    alignSelf: 'center',
    backgroundColor: colors.background.bg1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.divider.divider2,
    paddingLeft: 16,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  menuCardText: {
    ...ts('label2'),
    fontSize: 16,
    lineHeight: 20,
    color: colors.text.text1,
  },
  menuCardPressed: {
    backgroundColor: colors.background.bg2,
  },
  menuCardSpacing: {
    marginTop: 8,
  },
  sectionLabel: {
    ...ts('label3'),
    fontSize: 13,
    color: colors.text.text3,
    width: 358,
    marginTop: 40,
    paddingLeft: 2,
  },
  notificationGroup: {
    marginTop: 12,
    alignItems: 'center',
  },
  profileCard: {
    width: 358,
    height: 90,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: colors.background.bg1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.divider.divider2,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#D9D9D9',
    marginRight: 16,
  },
  profileContent: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
  },
  profileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  profileName: {
    ...ts('titleS'),
    color: colors.text.text1,
    marginRight: 16,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
  },
  profileBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
    height: 24,
  },
  envBadge: {
    minWidth: 64,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  envBadgeDev: {
    backgroundColor: '#E8FFF0',
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  colorSetBadge: {
    backgroundColor: '#EEF5FF',
    borderWidth: 1,
    borderColor: '#4F7BFF',
  },
  envBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#333',
  },
})
