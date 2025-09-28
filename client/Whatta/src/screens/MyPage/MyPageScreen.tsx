import React from 'react'
import { View, Text, SectionList, StyleSheet, Pressable } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MyPageStackList } from '@/navigation/MyPageStack'
import { MY_SECTIONS, type MyItem, type MySection } from '@/screens/MyPage/contants'
import colors from '@/styles/colors'

type Props = NativeStackScreenProps<MyPageStackList, 'MyPage'>

export default function MyPageScreen({ navigation }: Props) {
  return (
    <SectionList<MyItem, MySection>
      sections={MY_SECTIONS}
      keyExtractor={(item) => item.key}
      renderSectionHeader={({ section }) => (
        <View style={S.sectionHeader}>
          <Text style={S.sectionTitle}>{section.title}</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <Pressable style={S.item} onPress={() => navigation.navigate(item.route)}>
          <View style={{ flex: 1 }}>
            <Text style={S.itemTitle}>{item.key}</Text>
            {item.desc ? <Text style={S.rowDesc}>{item.desc}</Text> : null}
          </View>
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={S.separator}></View>}
      SectionSeparatorComponent={() => <View style={S.sectionGap}></View>}
      stickySectionHeadersEnabled
      contentInsetAdjustmentBehavior="automatic"
    />
  )
}

const S = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: colors.neutral.background,
  },
  sectionTitle: { fontSize: 18, color: colors.text.title, fontWeight: 'bold' },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.neutral.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  rowDesc: { fontSize: 13, color: colors.text.body },
  chevron: { fontSize: 26, color: colors.text.caption, marginLeft: 6 },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.secondary.main,
    marginLeft: 16,
  },
  sectionGap: { height: 14, backgroundColor: colors.neutral.surface },
})
