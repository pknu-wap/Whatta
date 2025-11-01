import React, { useRef, useState, useEffect } from 'react';
import {View, Text, StyleSheet, 
  ScrollView, NativeSyntheticEvent, 
  NativeScrollEvent, Pressable, 
  Platform, Dimensions,
} from 'react-native';

import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';

import colors from '@/styles/colors'
import { ts } from '@/styles/typography';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenWithSidebar from '@/components/sidebars/ScreenWithSidebar'



function FullBleed({ children, padH = 12, fill = false }: 
  { children: React.ReactNode; padH?: number; fill?: boolean }) 
{
  const [parentW, setParentW] = useState<number | null>(null);
  const screenW = Dimensions.get('window').width;
  const side = parentW == null ? 0 : (screenW - parentW) / 2;
  return (
    <View
      onLayout={(e) => setParentW(e.nativeEvent.layout.width)}
      style={{
        marginLeft: parentW == null ? 0 : -side,
        width: screenW,
        paddingHorizontal: padH,
        ...(fill ? { flex: 1 } : null),
      }}
    >
      {children}
    </View>
  );
}

/* Mock */
type TaskChip = { id: string; title: string };
type CheckItem = { id: string; title: string; done: boolean };

const PROJECTS: TaskChip[] = [
  { id: 'p1', title: 'ABC 프로젝트' },
  { id: 'p2', title: 'ABC 프로젝트' },
  { id: 'p3', title: 'ABC 프로젝트' },
];
const INITIAL_CHECKS: CheckItem[] = [
  { id: 'c1', title: 'B하기', done: false },
  { id: 'c2', title: 'C하기', done: false },
  { id: 'c3', title: 'D하기', done: true },
  { id: 'c4', title: 'E하기', done: false },
  { id: 'c5', title: 'F하기', done: true },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i ); // 0시 ~ 24시

export default function DayView() {
  const [checks, setChecks] = useState(INITIAL_CHECKS);

  // ✅ 라이브바 위치 계산
const [nowTop, setNowTop] = useState<number | null>(null);
const ROW_H = 48; // 시간 블록 높이 (S.row의 height와 동일하게!)

useEffect(() => {
  const updateNowTop = () => {
    const now = new Date();
    const hour = now.getHours();
    const min = now.getMinutes();
    const elapsed = hour + min / 60; // 현재 시각(시 단위)
    const topPos = (elapsed - 0) * ROW_H; // 0시부터 경과한 높이
    setNowTop(topPos);

    setTimeout(() => {
      gridScrollRef.current?.scrollTo({
        y: topPos - Dimensions.get('window').height * 0.2 + ROW_H / 2,
        animated: false,
      });
    }, 500);
  };

  updateNowTop(); // 첫 실행
  const timer = setInterval(updateNowTop, 60 * 1000); // 1분마다 갱신
  return () => clearInterval(timer);
}, []);

// ✅ DayView 화면이 다시 보일 때도 중앙으로 스크롤
useFocusEffect(
  React.useCallback(() => {
    if (nowTop != null && gridScrollRef.current) {
      gridScrollRef.current.scrollTo({
        y: nowTop - Dimensions.get('window').height * 0.2 + ROW_H / 2,
        animated: false,
      });
    }
  }, [nowTop])
);

  // 상단 박스 스크롤바 계산
  const [wrapH, setWrapH] = useState(150);
  const [contentH, setContentH] = useState(150);
  const [thumbTop, setThumbTop] = useState(0);
  const boxScrollRef = useRef<ScrollView>(null);
  const gridScrollRef = useRef<ScrollView>(null);

  const onLayoutWrap = (e: any) => setWrapH(e.nativeEvent.layout.height);
  const onContentSizeChange = (_: number, h: number) => setContentH(h);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const ratio = contentSize.height <= layoutMeasurement.height ? 0 :
      contentOffset.y / (contentSize.height - layoutMeasurement.height);
    const top = ratio * (layoutMeasurement.height - thumbH(layoutMeasurement.height, contentSize.height));
    setThumbTop(top);
  };
  const showScrollbar = contentH > wrapH;

  const toggleCheck = (id: string) =>
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ScreenWithSidebar mode="overlay">
  <View style={S.screen}>
    {/* ✅ 상단 테스크 박스 */}
    <FullBleed padH={12}>
      {/* ⬇️ 래퍼 추가 */}
      <View style={S.taskBoxWrap}>
        <View style={S.taskBox} onLayout={onLayoutWrap}>
          <ScrollView
            ref={boxScrollRef}
            onScroll={onScroll}
            onContentSizeChange={onContentSizeChange}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            contentContainerStyle={S.boxContent}
            bounces={false}
          >
            {PROJECTS.map((t, i) => (
              <View key={t.id} style={[S.chip, i === 0 && { marginTop: 8 }]}>
                <View style={S.chipBar} />
                <Text style={S.chipText} numberOfLines={1}>{t.title}</Text>
              </View>
            ))}

            {checks.map((c) => (
  <Pressable key={c.id} style={S.checkRow} onPress={() => toggleCheck(c.id)}>
    <View style={S.checkboxWrap}>
      <View style={[S.checkbox, c.done && S.checkboxOn]}>
        {c.done && <Text style={S.checkmark}>✓</Text>}
      </View>
    </View>
    <Text style={[S.checkText, c.done && S.checkTextDone]} numberOfLines={1}>
      {c.title}
    </Text>
  </Pressable>
))}
            <View style={{ height: 8 }} />
          </ScrollView>

          {showScrollbar && (
            <View pointerEvents="none" style={S.scrollTrack}>
              <View
                style={[
                  S.scrollThumb,
                  { height: thumbH(wrapH, contentH), transform: [{ translateY: thumbTop }] },
                ]}
              />
            </View>
          )}
        </View>

        {/* ⬇️ taskBox '바깥'에 경계선 + 아래로 페이드 */}
        <View pointerEvents="none" style={S.boxBottomLine} />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.10)', 'rgba(0,0,0,0.04)', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }}  // 위(경계선)에서 시작
          end={{ x: 0, y: 1 }}    // 아래로 사라짐
          style={S.fadeBelow}
        />
      </View>
      <View style={S.fadeGap} />
    </FullBleed>
      

      {/* ✅ 시간대 그리드 */}
        <ScrollView
        ref={gridScrollRef}
        style={S.gridScroll}
        contentContainerStyle={S.gridContent}
        showsVerticalScrollIndicator={false}>
  {HOURS.map((h, i) => {
  const isLast = i === HOURS.length - 1; // ✅ 마지막 행 여부 계산

  return (
    <View key={h} style={S.row}>
      <View style={S.timeCol}>
        <Text style={S.timeText}>
          {h === 0
            ? '오전 12시'
            : h < 12
            ? `오전 ${h}시`
            : h === 12
            ? '오후 12시'
            : `오후 ${h - 12}시`}
        </Text>
      </View>

      <View style={S.slotCol}>
        <View style={S.verticalLine} />
      </View>

      {/* ✅ 마지막 행이 아닐 때만 가로줄 표시 */}
      {!isLast && <View pointerEvents="none" style={S.guideLine} />}
    </View>
  );
})}
{/* ✅ 현재시간 라이브바 */}
{nowTop !== null && (
  <>
  <View style={[S.liveBar, { top: nowTop }]} />
  <View style={[S.liveDot, { top: nowTop - 3 }]} />
  </>
)}
{/* ✅ 드래그 가능한 일정 박스 */}
<DraggableFixedEvent />
<DraggableTaskBox />
<DraggableTaskBox />
<DraggableFlexalbeEvent />
</ScrollView>
    </View>
    </ScreenWithSidebar>
    </GestureHandlerRootView>
  );
}

/* 스크롤바 길이 계산 */
function thumbH(visibleH: number, contentH: number) {
  const minH = 18;
  const h = (visibleH * visibleH) / Math.max(contentH, 1);
  return Math.max(minH, Math.min(h, visibleH));
}

function DraggableFixedEvent() {
  const ROW_H = 48;
  const translateY = useSharedValue(7 * ROW_H); // 초기 9시 위치

  const drag = Gesture.Pan()
    .onChange((e) => {
      translateY.value += e.changeY;
    })
    .onEnd(() => {
      const snapped = Math.round(translateY.value / ROW_H) * ROW_H;
      translateY.value = withSpring(snapped);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={drag}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 50 + 16,
            right: 16,
            height: ROW_H * 3,
            backgroundColor: '#B04FFF26',
            paddingHorizontal: 4,
            paddingTop: 10,
            justifyContent: 'flex-start',
            zIndex: 10,
          },
          style,
        ]}
      >
        <Text
          style={{
            color: '#000000',
            fontWeight: '600',
            fontSize: 11,
            lineHeight: 10,
          }}
        >
          name(fixed)
        </Text>
        <Text
          style={{
            color: '#6B6B6B',
            fontSize: 10,
            marginTop: 10,
            lineHeight: 10,
          }}
        >
          place
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

function DraggableTaskBox() {
  const ROW_H = 48;
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const [done, setDone] = useState(false);

  const drag = Gesture.Pan()
    .onChange((e) => {
      translateY.value += e.changeY;
      translateX.value += e.changeX;
    })
    .onEnd(() => {
      const snappedY = Math.round(translateY.value / ROW_H) * ROW_H;
      translateY.value = withSpring(snappedY);
      translateX.value = withSpring(0);
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value + 2 },
      { translateX: translateX.value },
    ],
  }));

  return (
    <GestureDetector gesture={drag}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 50 + 18,
            right: 18,
            height: ROW_H - 4,
            backgroundColor: '#FFFFFFB2',
            borderWidth: 0.3,
            borderColor: '#B3B3B3',
            borderRadius: 10,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#525252',
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 3,
            zIndex: 20,
          },
          style,
        ]}
      >
        <Pressable
          onPress={() => setDone((prev) => !prev)}
          style={{
            width: 17,
            height: 17,
            borderWidth: 2,
            borderColor: done ? '#333333' : '#333',
            borderRadius: 6,
            marginRight: 12,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: done ? '#333333' : '#FFF',
          }}
        >
          {done && (
            <Text
              style={{
                color: '#FFFFFF',
                fontWeight: 'bold',
                fontSize: 13,
                lineHeight: 16,
              }}
            >
              ✓
            </Text>
          )}
        </Pressable>

        <View>
          <Text
            style={{
              color: done ? '#999' : '#000',
              fontWeight: 'bold',
              fontSize: 12,
              marginBottom: 2,
              textDecorationLine: done ? 'line-through' : 'none',
            }}
          >
            Title
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function DraggableFlexalbeEvent() {
  const ROW_H = 48;
  const translateY = useSharedValue(11 * ROW_H);

  const drag = Gesture.Pan()
    .onChange((e) => {
      translateY.value += e.changeY;
    })
    .onEnd(() => {
      const snapped = Math.round(translateY.value / ROW_H) * ROW_H;
      translateY.value = withSpring(snapped);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + 1}],
  }));

  return (
    <GestureDetector gesture={drag}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 50 + 16,
            right: 16,
            height: ROW_H * 2 -2 ,
            backgroundColor: '#668CFF',
            paddingHorizontal: 4,
            paddingTop: 10,
            borderRadius: 3,
            justifyContent: 'flex-start',
            zIndex: 10,
          },
          style,
        ]}
      >
        <Text
          style={{
            color: '#000000',
            fontWeight: '600',
            fontSize: 11,
            lineHeight: 10,
          }}
        >
          name(fixed)
        </Text>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 10,
            marginTop: 10,
            lineHeight: 10,
          }}
        >
          place
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

/* Styles */
const BORDER = 'rgba(0,0,0,0.08)';

const VERTICAL_LINE_WIDTH = 0.5; // S.verticalLine에서 쓰는 값

const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral.surface },

  taskBox: {
    width: '100%',
    height: 150,
    backgroundColor: colors.neutral.surface,
    overflow: 'hidden',
    borderColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 },
    }),
  },
  boxContent: { paddingVertical: 4 },

  chip: {
    marginHorizontal: 12, 
    marginTop: 4, 
    height: 22,
    backgroundColor: colors.task.chipback, 
    flexDirection: 'row', 
    alignItems: 'center',
  },

  chipBar: {
  width: 5,                      // ✅ 바 두께 5px
  height: 22,                    // ✅ 고정 높이 22p   
  backgroundColor: colors.task.chipbar, // ✅ 색상
  marginRight: 8,                // 텍스트와 간격
  },

  chipText: { ...ts('daySchedule'), color: '#000000'},

  checkRow: {
    height: 22, 
    marginHorizontal: 12, 
    marginTop: 8, 
    borderRadius: 3,
    backgroundColor: colors.neutral.surface, 
    borderWidth: StyleSheet.hairlineWidth, 
    borderColor: '#B3B3B3',
    flexDirection: 'row',
    alignItems: 'center', 
    paddingHorizontal: 12,
  },

  checkbox: {
    width: 10, 
    height: 10, 
    borderRadius: 1, 
    borderWidth: 1, 
    borderColor: '#333333',
    marginRight: 10, 
    backgroundColor: colors.neutral.surface,
  },
  checkboxOn: { backgroundColor: '#000000'},
  checkText: { ...ts('daySchedule'), color: '#000000' },

  checkboxWrap: {
  alignItems: 'center',
  justifyContent: 'center',
},

checkmark: {
  color: colors.neutral.surface,          // 체크 표시 색 (배경이 검정이라 흰색 추천)
  fontSize: 8,            // 크기 조정 (checkbox 크기 맞춰서)
  fontWeight: '700',
  lineHeight: 10,         // 중앙 정렬 맞춤
  textAlign: 'center',
},

checkTextDone: {
  color: '#888',
  textDecorationLine: 'line-through',
  textDecorationStyle: 'solid',
},

  scrollTrack: {
    position: 'absolute', right: 4, top: 10, bottom: 6, width: 4, borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  scrollThumb: { position: 'absolute', left: 0, right: 0, borderRadius: 2, backgroundColor: colors.neutral.gray },

  gridScroll: { flex: 1 },

row: {
  position: 'relative',          // ✅ 가로줄 절대배치 기준
  flexDirection: 'row',
  height: 48,
  backgroundColor: colors.neutral.surface,
  paddingHorizontal: 16,         // ✅ 휴대폰 좌/우 끝 기준 여백
  borderBottomWidth: 0,
  borderTopWidth: 0,
  borderColor: 'transparent',
},

timeCol: {
  width: 50,
  //justifyContent: 'center',
  alignItems: 'flex-end',
  paddingRight: 10,
},

slotCol: {
  flex: 1,
  justifyContent: 'center',
  position: 'relative',      
},

/* 세로 기준선: 시간 라벨 오른쪽 경계 */
verticalLine: {
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: 0.5,                    // 원하면 1~2로 조정
  backgroundColor: colors.neutral.timeline,
},

/* ✅ 가로줄: row 기준으로 좌우 16px 여백 */
guideLine: {
  position: 'absolute',
  left: 16,                      // 휴대폰 좌측 끝 기준
  right: 16,                     // 휴대폰 우측 끝 기준
  bottom: 0,
  height: 0.5,                   // 두께(원하면 1~2)
  backgroundColor: colors.neutral.timeline,
},
timeText: { ...ts('time'), color: colors.neutral.gray },


taskBoxWrap: {
  position: 'relative',
  overflow: 'visible', 
},


boxBottomLine: {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,                                   // taskBox 하단과 정확히 일치
  height: StyleSheet.hairlineWidth || 1,
  backgroundColor: 'rgba(0,0,0,0.08)',
  zIndex: 2,
},

fadeBelow: {
  position: 'absolute',
  left: -12,
  right: -12,
  top: '100%',           // ✅ 래퍼(=taskBox) 높이 바로 아래에서 시작
  height: 18,   // 페이드 길이 (원하면 20~32 조절)
  zIndex: 1,
},

fadeGap: {
  height: 12, // 페이드와 시간대 그리드 사이 간격
},

gridContent: {
  paddingBottom: 10,  // ✅ 아래쪽 여백 (필요한 만큼 조절)
},

liveBar: {
  position: 'absolute',
  left: 50 + 16,
  right: 16,
  height: 1,
  backgroundColor: colors.primary.main,
  borderRadius: 1,
  zIndex: 10,
},

liveDot: {
  position: 'absolute',
  left: 50 + 16 - 3, // ✅ 세로줄 기준 + 간격 - 반지름 (liveBar 시작점 기준)
  width: 7,
  height: 7,
  borderRadius: 5,
  backgroundColor: colors.primary.main,
  zIndex: 11, // liveBar보다 위로
},

});