import { StyleSheet } from 'react-native'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import { ROW_H } from './constants'

const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral.surface },

  taskBox: {
    width: '100%',
    height: 160,
    backgroundColor: '#FFFFFF',
    overflow: 'visible',
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  boxContent: {
    paddingVertical: 3,
    paddingBottom: 3,
    width: '100%',
    minWidth: '100%',
    flexGrow: 1,
    alignItems: 'stretch',
  },
  boxScroll: {
    overflow: 'visible',
  },
  taskBoxInner: {
    flex: 1,
    flexDirection: 'row',
  },
  taskBoxDateCol: {
    width: 50,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: 1,
    paddingLeft: 0,
  },
  taskBoxDateText: {
    ...ts('label1'),
    fontSize: 19,
    color: '#111111',
  },
  taskBoxWeekdayText: {
    ...ts('date3'),
    marginTop: 0,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    color: '#333333',
  },
  taskBoxContentArea: {
    flex: 1,
    position: 'relative',
    overflow: 'visible',
  },
  topItemRow: {
    width: '100%',
    height: 30,
    marginBottom: 6,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  topCard: {
    width: 308,
    minHeight: 30,
    height: 30,
    alignSelf: 'flex-start',
  },
  topCardFull: {
    width: '100%',
    minHeight: 30,
    height: 30,
    alignSelf: 'stretch',
  },
  topCardSpanExtend: {
    marginRight: 0,
  },

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
    height: ROW_H,
    backgroundColor: colors.neutral.surface,
    paddingHorizontal: 16,
    borderBottomWidth: 0,
    borderTopWidth: 0,
    borderColor: 'transparent',
  },

  timeCol: {
    width: 50,
    alignItems: 'flex-end',
    paddingRight: 0,
  },

  slotCol: {
    flex: 1,
    justifyContent: 'center',
    position: 'relative',
  },

  guideLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    height: 0.3,
    backgroundColor: '#C7D0D6',
  },
  timeText: {
    ...ts('date3'),
    fontSize: 12,
    lineHeight: 20,
    color: colors.text.text4,
    fontWeight: '500',
    textAlign: 'left',
    width: '100%',
    marginLeft: 0,
    marginRight: 0,
    includeFontPadding: false,
  },

  taskBoxWrap: {
    position: 'relative',
    overflow: 'visible',
  },

  fadeBelow: {
    position: 'absolute',
    left: -16,
    right: -16,
    top: '100%',
    height: 24,
    zIndex: 1,
  },

  fadeGap: {
    height: 0,
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
