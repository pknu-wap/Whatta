// components/dayview/DayTaskBox.tsx
import React from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import FullBleed from './FullBleed'

type DayTaskBoxProps = {
  spanEvents: any[]
  checks: any[]
  anchorDate: string
  openEventDetail: (event: any) => void
  openTaskPopupFromApi: (taskId: string) => void
  toggleCheck: (id: string) => void

  boxScrollRef: any
  onScroll: (e: any) => void
  onContentSizeChange: (w: number, h: number) => void

  showScrollbar: boolean
  wrapH: number
  contentH: number
  thumbTop: number
  thumbH: (visibleH: number, contentH: number) => number

  styles: any
  onLayoutWrap: (e: any) => void
  measureLayouts: () => void
}

export default function DayTaskBox({
  spanEvents,
  checks,
  anchorDate,
  openEventDetail,
  openTaskPopupFromApi,
  toggleCheck,
  boxScrollRef,
  onScroll,
  onContentSizeChange,
  showScrollbar,
  wrapH,
  contentH,
  thumbTop,
  thumbH,
  styles,
  onLayoutWrap,
  measureLayouts,
}: DayTaskBoxProps) {
  return (
    <FullBleed padH={12}>
      <View style={styles.taskBoxWrap} onLayout={measureLayouts}>
        <View
          style={styles.taskBox}
          onLayout={(e) => {
            onLayoutWrap(e)
            measureLayouts()
          }}
        >
          <ScrollView
            ref={boxScrollRef}
            onScroll={onScroll}
            onContentSizeChange={onContentSizeChange}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            contentContainerStyle={styles.boxContent}
            bounces={false}
          >
            {spanEvents.map((t, i) => {
              const current = anchorDate

              let start = ''
              let end = ''

              if (!t.startDate && !t.endDate && !t.startAt && !t.endAt) {
                start = current
                end = current
              } else if (t.startDate && t.endDate) {
                start = t.startDate
                end = t.endDate
              } else if (t.startAt && t.endAt) {
                start = t.startAt.slice(0, 10)
                end = t.endAt.slice(0, 10)
              }

              const isStart = current === start
              const isEnd = current === end

              const raw = t.colorKey || t.color
              const base = raw?.startsWith('#') ? raw : `#${raw}`
              const bg = `${base}4D`

              return (
                <Pressable key={t.id ?? i} onPress={() => openEventDetail(t)}>
                  <View
                    style={[
                      styles.chip,
                      {
                        backgroundColor: bg,
                        borderTopLeftRadius: isStart ? 6 : 0,
                        borderBottomLeftRadius: isStart ? 6 : 0,
                        borderTopRightRadius: isEnd ? 6 : 0,
                        borderBottomRightRadius: isEnd ? 6 : 0,
                      },
                    ]}
                  >
                    {isStart && (
                      <View style={[styles.chipBar, { left: 0, backgroundColor: base }]} />
                    )}
                    {isEnd && (
                      <View style={[styles.chipBar, { right: 0, backgroundColor: base }]} />
                    )}
                    <View style={{ flex: 1, paddingHorizontal: 12 }}>
                      <Text style={styles.chipText} numberOfLines={1}>
                        {t.title}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              )
            })}

            {checks.map((c) => (
              <Pressable
                key={c.id}
                style={styles.checkRow}
                onPress={() => openTaskPopupFromApi(c.id)}
              >
                <Pressable onPress={() => toggleCheck(c.id)} style={styles.checkboxWrap}>
                  <View style={[styles.checkbox, c.done && styles.checkboxOn]}>
                    {c.done && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </Pressable>

                <Text
                  style={[styles.checkText, c.done && styles.checkTextDone]}
                  numberOfLines={1}
                >
                  {c.title}
                </Text>
              </Pressable>
            ))}

            <View style={{ height: 8 }} />
          </ScrollView>

          {showScrollbar && (
            <View pointerEvents="none" style={styles.scrollTrack}>
              <View
                style={[
                  styles.scrollThumb,
                  {
                    height: thumbH(wrapH, contentH),
                    transform: [{ translateY: thumbTop }],
                  },
                ]}
              />
            </View>
          )}
        </View>

        <View pointerEvents="none" style={styles.boxBottomLine} />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.10)', 'rgba(0,0,0,0.04)', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.fadeBelow}
        />
      </View>
      <View style={styles.fadeGap} />
    </FullBleed>
  )
}