import { Dimensions } from "react-native"
export const ROW_H = 61
export const PIXELS_PER_HOUR = ROW_H
export const PIXELS_PER_MIN = PIXELS_PER_HOUR / 60
export const DAY_GRID_BOTTOM_SPACER = ROW_H * 2.8
export const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
