import React, { useLayoutEffect } from 'react'
import { View, Text, SectionList, StyleSheet, Pressable } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MyPageStackList } from '@/navigation/MyPageStack'
import { MY_SECTIONS, type MyItem, type MySection } from '@/screens/MyPage/contants'
import colors from '@/styles/colors'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type Props = NativeStackScreenProps<MyPageStackList, 'MyPageList'>

function SectionCard({
  title,
  actions,
  onPress,
}: {
  title?: string
  actions: { label: string; route: keyof MyPageStackList }[]
  onPress: (route: keyof MyPageStackList) => void
}) {
  return (
    <View style={S.card}>
      {/* 타이틀 */}
      {title ? <Text style={S.cardTitle}>{title}</Text> : null}

      {/* 하단 선 */}
      <View style={S.cardDivider} />

      {/* 버튼 2개 자리 */}
      <View style={S.cardBody}>
        {actions.slice(0, 2).map((a, idx) => (
          <Pressable key={idx} style={S.cardButton} onPress={() => onPress(a.route)}>
            <Text style={S.cardButtonText}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

function SmallCard({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={S.smallCard} onPress={onPress}>
      <Text style={S.smallCardText}>{label}</Text>
    </Pressable>
  )
}

function SimpleHeader() {
  const insets = useSafeAreaInsets()
  return (
    <View style={{ backgroundColor: colors.neutral.surface }}>
      <View style={{ height: insets.top }} />
      <View
        style={{
          height: 48,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.neutral.surface,
          borderBottomWidth: 0.3,
          borderBottomColor: '#B3B3B3',
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: '700' }}>마이페이지</Text>
      </View>
    </View>
  )
}

export default function MyPageScreen({ navigation }: Props) {
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerShadowVisible: false,
      header: () => <SimpleHeader />,
    })
  }, [navigation])

  return (
    <SectionList<MyItem, MySection>
      sections={MY_SECTIONS}
      keyExtractor={(item) => item.key}
      renderItem={() => null}
      renderSectionHeader={({ section }) =>
        section.size === 'small' ? (
          <>
            {section.data.map((d, i) => (
              <SmallCard
                key={i}
                label={d.key}
                onPress={() => navigation.navigate(d.route)}
              />
            ))}
          </>
        ) : (
          <SectionCard
            title={section.title}
            actions={section.data.map((d) => ({ label: d.key, route: d.route }))}
            onPress={(route) => navigation.navigate(route)}
          />
        )
      }
      ListHeaderComponent={
        <View
          style={{
            paddingTop: 2,
            paddingBottom: 2,
            backgroundColor: colors.neutral.background,
          }}
        >
          {/* 프로필 카드 */}
          <View style={S.profileCard}>
            <View style={S.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={S.profileName}>사용자님</Text>
              {/* <Text style={S.profileMeta}>나이 / 직업</Text> */}
            </View>
            {/* <Text style={S.editLink}>편집</Text> */}
          </View>
        </View>
      }
      ItemSeparatorComponent={null}
      SectionSeparatorComponent={() => <View style={{ height: 2 }} />}
      stickySectionHeadersEnabled
      contentInsetAdjustmentBehavior="automatic"
      contentInset={{ top: 0, bottom: 10, left: 0, right: 0 }}
      scrollIndicatorInsets={{ top: 0, bottom: 120, left: 0, right: 0 }}
    />
  )
}

const S = StyleSheet.create({
  smallCard: {
    width: '90%',
    height: 48,
    alignSelf: 'center',
    marginTop: 8,
    backgroundColor: colors.neutral.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 0 },
  },
  smallCardText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.title,
  },
  card: {
    width: '90%',
    height: 100,
    alignSelf: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 0 },
  },
  cardTitle: {
    position: 'absolute',
    top: 15,
    left: 16,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.caption,
  },

  cardDivider: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#B3B3B3',
  },
  cardBody: {
    position: 'absolute',
    top: 53,
    left: 16,
    right: 16,
    bottom: 12,
    justifyContent: 'space-between',
  },
  cardButton: {
    flex: 1,
    justifyContent: 'center',
  },
  cardButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.title,
  },

  // 프로필 카드
  profileCard: {
    width: '90%',
    alignSelf: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: colors.neutral.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 0 },
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E9ECF1',
    marginRight: 12,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.title,
    marginTop: 3,
  },
  profileMeta: { fontSize: 14, color: colors.text.body, marginTop: 7 },
  editLink: { color: '#333', fontWeight: '600' },
  chevron: { fontSize: 26, color: colors.text.caption, marginLeft: 6 },
})
