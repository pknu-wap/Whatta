import { StyleSheet, Dimensions } from 'react-native'
import { ts } from '@/styles/typography'
import colors from '@/styles/colors'

const { width: screenWidth } = Dimensions.get('window')
const horizontalPadding = 12
const dynamicCellWidth = (screenWidth - horizontalPadding) / 7
export const cellWidth = Math.min(60, dynamicCellWidth)
const MIN_CELL_HEIGHT = 120

export const S = StyleSheet.create({
  contentContainerWrapper: { flex: 1, paddingBottom: 0, paddingTop: 0 },
  contentArea: { flex: 1, paddingHorizontal: 6, paddingTop: 0 },
  scrollContentContainer: { paddingBottom: 20 },

  dayHeader: {
    flexDirection: 'row',
    marginBottom: 4,
    marginTop: 2,
    paddingHorizontal: 6,
    alignItems: 'flex-start',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.divider.divider2,
  },
  dayCellFixed: { width: cellWidth, alignItems: 'center' },
  dayTextBase: {
    ...ts('date3'),
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.text2,
    textAlign: 'center',
    marginBottom: 6,
  },
  sunText: { color: colors.text.monday },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)',
    zIndex: 99,
  },

  calendarGrid: {},
  weekRow: {
    flexDirection: 'row',
    width: '100%',
  },
  dateCell: {
    width: cellWidth,
    minHeight: MIN_CELL_HEIGHT,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    position: 'relative',
    borderWidth: 0,
    borderRightWidth: 0.5,
    borderRightColor: colors.divider.divider2,
    paddingBottom: 2,
    overflow: 'visible',
    zIndex: 1,
  },
  dateNumberWrapper: {
    width: '100%',
    alignItems: 'center',
    position: 'relative',
  },
  dateNumberWrapperNoHoliday: {
    height: 18,
    justifyContent: 'center',
    paddingTop: 0,
  },
  dateNumberWrapperWithHoliday: {
    height: 28,
    justifyContent: 'flex-start',
    paddingTop: 1,
  },
  dateTopLine: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePill: {
    width: 48,
    height: 16,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 1,
  },
  datePillToday: {
    backgroundColor: '#EFE7F7',
  },
  dateNumberBase: {
    ...ts('date3'),
    color: colors.text.text1,
    zIndex: 1,
  },
  dateNumberToday: {
    ...ts('label4'),
    color: colors.brand.primary,
  },
  otherMonthDateText: { color: 'gray' },
  holidayDateText: { color: 'red' },
  holidayText: {
    ...ts('body3'),
    marginTop: 0,
    textAlign: 'center',
    color: 'red',
    lineHeight: 12,
  },
  otherMonthHolidayText: { color: '#F08080' },
  smallHolidayText: { fontSize: ts('body3').fontSize },

  eventArea: {
    width: '100%',
    paddingHorizontal: 0,
    paddingTop: 1,
    paddingBottom: 0,
  },
})

