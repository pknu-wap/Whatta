import { StyleSheet, Platform } from 'react-native'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'


const BORDER = 'rgba(0,0,0,0.08)'

const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral.surface },

  taskBox: {
    width: '100%',
    height: 150,
    backgroundColor: colors.neutral.surface,
    overflow: 'hidden',
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 3 },
    }),
  },
  boxContent: { paddingVertical: 4 },

  chip: {
    marginHorizontal: 12,
    marginTop: 4,
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },

  chipBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 5,
  },

  chipText: {
    ...ts('daySchedule'),
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
  },

  checkRow: {
    height: 22,
    marginHorizontal: 11.5,
    marginTop: 8,
    borderRadius: 3,
    backgroundColor: colors.neutral.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#333333',
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
    marginRight: 8,
    backgroundColor: colors.neutral.surface,
  },

  checkboxOn: { backgroundColor: '#000000' },
  checkText: {
    ...ts('daySchedule'),
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
  },

  checkboxWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkmark: {
    color: colors.neutral.surface,
    fontSize: 8,
    fontWeight: '700',
    lineHeight: 10,
    textAlign: 'center',
  },

  checkTextDone: {
    color: '#888',
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    fontSize: 12,
    fontWeight: '600',
  },

  scrollTrack: {
    position: 'absolute',
    right: 4,
    top: 10,
    bottom: 6,
    width: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  scrollThumb: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 2,
    backgroundColor: colors.neutral.gray,
  },

  gridScroll: { flex: 1 },

  row: {
    position: 'relative',
    flexDirection: 'row',
    height: 48,
    backgroundColor: colors.neutral.surface,
    paddingHorizontal: 16,
    borderBottomWidth: 0,
    borderTopWidth: 0,
    borderColor: 'transparent',
  },

  timeCol: {
    width: 50,
    alignItems: 'flex-end',
    paddingRight: 10,
  },

  slotCol: {
    flex: 1,
    justifyContent: 'center',
    position: 'relative',
  },

  verticalLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 0.3,
    backgroundColor: colors.neutral.timeline,
  },

  guideLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    height: 0.3,
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
    bottom: 0,
    height: StyleSheet.hairlineWidth || 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    zIndex: 2,
  },

  fadeBelow: {
    position: 'absolute',
    left: -12,
    right: -12,
    top: '100%',
    height: 18,
    zIndex: 1,
  },

  fadeGap: {
    height: 13, // taskBox와 그리드 사이 간격
  },

  gridContent: {
    paddingBottom: 10,
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
    left: 50 + 16 - 3,
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: colors.primary.main,
    zIndex: 11,
  },
})

export default S