import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, { interpolateColor, useAnimatedProps } from 'react-native-reanimated'
import { useDrawer } from '@/providers/DrawerProvider'
import useToday from '@/hooks/useToday'

import Menu from '@/assets/icons/menu.svg'
import Filter from '@/assets/icons/filter.svg'
import Left from '@/assets/icons/left.svg'
import Right from '@/assets/icons/right.svg'

import colors from '@/styles/colors'
import { ts } from '@/styles/typography'

const AnimatedMenu = Animated.createAnimatedComponent(Menu)

const defaultMenuColor = colors.icon.default
const activeMenuColor = colors.primary.main

export default function Header() {
  const { progress, toggle } = useDrawer()
  const today = useToday('YYYY년 MM월 DD일 (dd)')

  const menuIconProps = useAnimatedProps(() => {
    const animatedColor = interpolateColor(
      progress.value,
      [0, 1],
      [defaultMenuColor, activeMenuColor],
    )
    return { color: animatedColor }
  }, [[defaultMenuColor]])

  return (
    <View style={S.root}>
      <View style={S.header}>
        <TouchableOpacity onPress={toggle}>
          <AnimatedMenu
            width={28}
            height={28}
            animatedProps={menuIconProps}
          ></AnimatedMenu>
        </TouchableOpacity>

        <View style={S.dateGroup}>
          <TouchableOpacity>
            <Left width={24} height={24} style={{ marginRight: 3 }}></Left>
          </TouchableOpacity>

          <View style={S.titleContainer}>
            <Text style={[ts('date'), S.title]}>{today}</Text>
          </View>

          <TouchableOpacity>
            <Right
              width={24}
              height={24}
              color={colors.icon.default}
              style={{ marginTop: 1 }}
            ></Right>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => {
            /* 필터 열기 */
          }}
        >
          <Filter
            width={22}
            height={22}
            color={colors.icon.default}
            style={{ marginRight: 15, marginTop: 2 }}
          ></Filter>
        </TouchableOpacity>
      </View>
    </View>
  )
}
const S = StyleSheet.create({
  root: {
    borderBottomWidth: 0.3,
    borderBottomColor: '#B3B3B3',
    height: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 5,
    marginLeft: 14,
  },
  titleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  dateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 19, fontWeight: '600' },
})
