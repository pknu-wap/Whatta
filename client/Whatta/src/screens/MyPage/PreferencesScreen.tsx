import React, { useLayoutEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { MyPageStackList } from '@/navigation/MyPageStack'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import LeftIcon from '@/assets/icons/left.svg'
import {
  SCHEDULE_COLOR_SETS,
  SCHEDULE_COLOR_SET_IDS,
  getActiveScheduleColorSetId,
  setActiveScheduleColorSetId,
  type ScheduleColorSetId,
} from '@/styles/scheduleColorSets'
import { bus } from '@/lib/eventBus'

type Props = NativeStackScreenProps<MyPageStackList, 'Preferences'>

type ThemeMeta = {
  title: string
  primaryIndex: number
  secondaryIndex: number
}

const THEME_META: Record<ScheduleColorSetId, ThemeMeta> = {
  basic: {
    title: '기본',
    primaryIndex: 0,
    secondaryIndex: 1,
  },
  set1: {
    title: '가을 파스텔',
    primaryIndex: 0,
    secondaryIndex: 10,
  },
  set2: {
    title: '봄 파스텔',
    primaryIndex: 2,
    secondaryIndex: 10,
  },
  set3: {
    title: '여름 파스텔',
    primaryIndex: 1,
    secondaryIndex: 6,
  },
}

function Header({
  title,
  onPressBack,
  onPressDone,
}: {
  title: string
  onPressBack: () => void
  onPressDone: () => void
}) {
  const insets = useSafeAreaInsets()

  return (
    <View style={{ backgroundColor: colors.background.bg1 }}>
      <View style={{ height: insets.top }} />
      <View style={styles.header}>
        <Pressable
          onPress={onPressBack}
          style={({ pressed }) => [styles.headerSideButton, pressed && styles.pressed]}
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

        <Text style={styles.headerTitle}>{title}</Text>

        <Pressable
          onPress={onPressDone}
          style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}
          hitSlop={10}
        >
          <Text style={styles.doneText}>✓</Text>
        </Pressable>
      </View>
    </View>
  )
}

function ThemeCard({
  title,
  colorsList,
  primaryColor,
  secondaryColor,
  selected,
  onPress,
}: {
  title: string
  colorsList: readonly string[]
  primaryColor: string
  secondaryColor: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      <Text style={styles.cardTitle}>{title}</Text>

      <View style={[styles.previewBar, { backgroundColor: primaryColor }]}>
        <Text style={styles.previewBarText}>기본 색상</Text>
      </View>

      <View style={[styles.previewBar, { backgroundColor: secondaryColor, marginTop: 8 }]}>
        <Text style={styles.previewBarText}>기본 색상</Text>
      </View>

      <View style={styles.chipGrid}>
        {colorsList.map((color, index) => (
          <View
            key={`${title}-${index}`}
            style={[styles.colorChip, { backgroundColor: color }]}
          />
        ))}
      </View>
    </Pressable>
  )
}

export default function PreferencesScreen({ navigation }: Props) {
  const [selectedId, setSelectedId] = useState<ScheduleColorSetId>(
    getActiveScheduleColorSetId(),
  )

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerShadowVisible: false,
      header: () => (
        <Header
          title="일정 색상 변경"
          onPressBack={() => navigation.goBack()}
          onPressDone={() => navigation.goBack()}
        />
      ),
    })
  }, [navigation])

  const themeItems = useMemo(() => {
    return SCHEDULE_COLOR_SET_IDS.map((id) => {
      const palette = SCHEDULE_COLOR_SETS[id]
      const meta = THEME_META[id]

      return {
        id,
        title: meta.title,
        colorsList: palette,
        primaryColor: palette[meta.primaryIndex] ?? palette[0],
        secondaryColor: palette[meta.secondaryIndex] ?? palette[1] ?? palette[0],
      }
    })
  }, [])

  const handleSelectTheme = (id: ScheduleColorSetId) => {
    const changed = setActiveScheduleColorSetId(id)
    setSelectedId(changed)
    bus.emit('scheduleColorSet:changed', { setId: changed })
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {themeItems.map((item) => (
            <ThemeCard
              key={item.id}
              title={item.title}
              colorsList={item.colorsList}
              primaryColor={item.primaryColor}
              secondaryColor={item.secondaryColor}
              selected={selectedId === item.id}
              onPress={() => handleSelectTheme(item.id)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.bg1,
  },
  header: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.bg1,
  },
  headerTitle: {
    ...ts('titleM'),
    color: colors.text.text1,
  },
  headerSideButton: {
    position: 'absolute',
    left: 16,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButton: {
    position: 'absolute',
    right: 16,
    minWidth: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '700',
    color: '#A855F7',
  },
  pressed: {
    opacity: 0.7,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  card: {
    width: '48%',
    minHeight: 210,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.divider.divider2,
    backgroundColor: colors.background.bg1,
    padding: 14,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: '#A855F7',
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardTitle: {
    ...ts('label2'),
    color: colors.text.text1,
    marginBottom: 14,
  },
  previewBar: {
    width: '100%',
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  previewBarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  chipGrid: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  colorChip: {
    width: 20,
    height: 12,
    borderRadius: 6,
  },
})