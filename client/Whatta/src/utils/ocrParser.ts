import { getDateOfWeek } from './dateUtils'

export function parseOCREvents(events: any[]) {
  return events
    .map((ev, idx) => ({
      id: String(idx),
      title: ev.title ?? '',
      content: ev.content ?? '',
      weekDay: ev.weekDay ?? '',
      date: getDateOfWeek(ev.weekDay),
      startTime: ev.startTime ?? '',
      endTime: ev.endTime ?? '',
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}