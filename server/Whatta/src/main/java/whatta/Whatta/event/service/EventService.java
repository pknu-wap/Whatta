package whatta.Whatta.event.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import whatta.Whatta.calendar.repository.CalendarEventsRepositoryCustom;
import whatta.Whatta.calendar.repository.dto.CalendarEventSummaryItem;
import whatta.Whatta.event.entity.Event;
import whatta.Whatta.event.enums.EventClearField;
import whatta.Whatta.event.mapper.EventMapper;
import whatta.Whatta.event.payload.request.EventCreateRequest;
import whatta.Whatta.event.payload.request.EventUpdateRequest;
import whatta.Whatta.event.payload.response.EventResponse;
import whatta.Whatta.event.payload.response.TodayEventSummaryResponse;
import whatta.Whatta.event.repository.EventRepository;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.global.util.LabelUtil;
import whatta.Whatta.global.util.LocalDateTimeUtil;
import whatta.Whatta.notification.service.ReminderNotiService;
import whatta.Whatta.user.account.entity.User;
import whatta.Whatta.user.setting.entity.UserSetting;
import whatta.Whatta.user.account.repository.UserRepository;
import whatta.Whatta.user.setting.repository.UserSettingRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;

import static whatta.Whatta.global.util.RepeatUtil.expandRepeatDates;

@Service
@AllArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final CalendarEventsRepositoryCustom calendarEventsRepository;
    private final UserRepository userRepository;
    private final UserSettingRepository userSettingRepository;
    private final EventMapper eventMapper;
    private final ReminderNotiService scheduledNotiService;

    @Transactional
    public EventResponse createEvent(String userId, EventCreateRequest request) {

        User user = userRepository.findUserById(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_SETTING_NOT_FOUND));

        LabelUtil.validateLabelsInUserSettings(userSetting, request.labels());

        Event.EventBuilder eventBuilder = Event.builder()
                .userId(user.getId())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .repeat((request.repeat() == null) ? null : request.repeat().toEntity())
                .colorKey(request.colorKey());
        if(request.title() != null && !request.title().isBlank()) eventBuilder.title(request.title());
        if(request.content() != null && !request.content().isBlank()) eventBuilder.content(request.content());
        if(request.labels() != null && !request.labels().isEmpty()) eventBuilder.labels(request.labels());
        eventBuilder.startTime(LocalDateTimeUtil.stringToLocalTime(request.startTime()));
        eventBuilder.endTime(LocalDateTimeUtil.stringToLocalTime(request.endTime()));
        eventBuilder.reminderNotiAt(request.reminderNoti());

        Event event = eventBuilder.build().normalizeAndValidateDateTimeOrder();

        Event newEvent = eventRepository.save(event);
        scheduledNotiService.updateReminderNotification(newEvent);

       return eventMapper.toEventDetailsResponse(newEvent);
    }

    public EventResponse getEventDetails(String userId, String eventId) {

        Event event = eventRepository.findEventByIdAndUserId(eventId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.EVENT_NOT_FOUND));

        return eventMapper.toEventDetailsResponse(event);
    }

    @Transactional(readOnly = true)
    public List<TodayEventSummaryResponse> getTodaySummary(String userId) {
        LocalDate today = LocalDate.now();

        return calendarEventsRepository.getTodaySummaryByUserId(userId, today).stream()
                .flatMap(item -> buildTodaySummaryEntries(item, today).stream())
                .sorted(Comparator
                        .comparing(SummaryItem::sortStartTime, Comparator.nullsFirst(Comparator.naturalOrder()))
                        .thenComparing(SummaryItem::sortEndTime, Comparator.nullsFirst(Comparator.naturalOrder()))
                        .thenComparing(SummaryItem::title, String.CASE_INSENSITIVE_ORDER))
                .map(SummaryItem::response)
                .toList();
    }

    @Transactional
    public EventResponse updateEvent(String userId, String eventId, EventUpdateRequest request) {

        Event originalEvent = eventRepository.findEventByIdAndUserId(eventId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.EVENT_NOT_FOUND));

        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_SETTING_NOT_FOUND));

        Event.EventBuilder builder = originalEvent.toBuilder();
        if(request.title() != null && !request.title().isBlank()) builder.title(request.title());
        if(request.content() != null && !request.content().isBlank()) builder.content(request.content());
        if(request.labels() != null && !request.labels().isEmpty()) {
            LabelUtil.validateLabelsInUserSettings(userSetting, request.labels());
            builder.labels(request.labels());
        }
        if(request.startDate() != null) builder.startDate(request.startDate());
        if(request.endDate() != null) builder.endDate(request.endDate());
        if(request.startTime() != null)
            builder.startTime(stringToLocalTime(request.startTime()));
        if(request.endTime() != null)
            builder.endTime(stringToLocalTime(request.endTime()));
        if(request.repeat() != null)
            builder.repeat(request.repeat().toEntity());
        if(request.colorKey() != null) builder.colorKey(request.colorKey());
        if(request.reminderNoti() != null)
            builder.reminderNotiAt(request.reminderNoti());

        /* 명시된 field를 초기화
        혹시라도 특정필드 수정요청과 초기화를 같이 모순되게 보낼경우 초기화가 우선됨 */
        EnumSet<EventClearField> clearFields = EnumSet.noneOf(EventClearField.class);
        if (request.fieldsToClear() != null && !request.fieldsToClear().isEmpty()) {
            for (String fieldName : request.fieldsToClear()) {
                clearFields.add(EventClearField.parse(fieldName));
            }
        }
        for (EventClearField fieldName : clearFields) {
            switch (fieldName) { //date와 colorkey는 null로 초기화 안함
                case TITLE -> builder.title("새로운 일정");
                case CONTENT -> builder.content("");
                case LABELS -> builder.labels(new ArrayList<>());
                case START_TIME -> builder.startTime(null);
                case END_TIME -> builder.endTime(null);
                case REPEAT -> builder.repeat(null);
                case REMINDER_NOTI -> builder.reminderNotiAt(null);
            }
        }

        Event event = builder.build();

        /* 현재 프론트에서 "이후 일정 모두 수정/삭제" 요청 시,
        반복 마감일(deadline)을 전개 기준 날짜 -1일로 전달하므로,
        startDate > repeat.endDate 상태가 발생할 수 있어 이를 삭제로 처리하는 임시 조치 */
        if (shouldDeleteBecauseStartAfterRepeatEnd(event)) { //TODO: 앱 프론트 코드 수정 후 삭제 + 유효성 검증 추가
            scheduledNotiService.cancelReminderNotification(eventId);
            eventRepository.delete(originalEvent);

            return eventMapper.toEventDetailsResponse(originalEvent);
        }

        Event updatedEvent = eventRepository.save(event.normalizeAndValidateDateTimeOrder());
        scheduledNotiService.updateReminderNotification(updatedEvent);

        return eventMapper.toEventDetailsResponse(updatedEvent);
    }

    private LocalTime stringToLocalTime(String time) {
        return LocalDateTimeUtil.stringToLocalTime(time);
    }

    private boolean shouldDeleteBecauseStartAfterRepeatEnd(Event event) {
        if (event.getRepeat() == null) return false;
        if (event.getRepeat().getDeadline() == null) return false;
        return event.getStartDate().isAfter(event.getRepeat().getDeadline());
    }

    @Transactional
    public void deleteEvent(String userId, String eventId) {
        Event event = eventRepository.findEventByIdAndUserId(eventId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.EVENT_NOT_FOUND));

        scheduledNotiService.cancelReminderNotification(eventId);
        eventRepository.delete(event);
    }

    private List<SummaryItem> buildTodaySummaryEntries(CalendarEventSummaryItem item, LocalDate date) {
        if (item.repeat() == null) {
            if (date.isBefore(item.startDate()) || date.isAfter(item.endDate())) {
                return List.of();
            }
            return List.of(buildSummaryItem(item, item.startDate(), item.endDate(), date));
        }

        long spanDays = java.time.temporal.ChronoUnit.DAYS.between(item.startDate(), item.endDate());
        LocalTime rootTime = item.startTime() != null ? item.startTime() : LocalTime.NOON;
        List<LocalDate> occurrenceDates = expandRepeatDates(
                LocalDateTime.of(item.startDate(), rootTime),
                item.repeat(),
                date.minusDays(spanDays),
                date
        );

        return occurrenceDates.stream()
                .filter(occurrenceDate -> !date.isBefore(occurrenceDate)
                        && !date.isAfter(occurrenceDate.plusDays(spanDays)))
                .map(occurrenceDate -> buildSummaryItem(
                        item,
                        occurrenceDate,
                        occurrenceDate.plusDays(spanDays),
                        date))
                .toList();
    }

    private SummaryItem buildSummaryItem(CalendarEventSummaryItem item,
                                         LocalDate occurrenceStartDate,
                                         LocalDate occurrenceEndDate,
                                         LocalDate targetDate) {
        LocalTime displayStartTime = resolveDisplayStartTime(item, occurrenceStartDate, targetDate);
        LocalTime displayEndTime = resolveDisplayEndTime(item, occurrenceEndDate, targetDate);

        return new SummaryItem(
                displayStartTime,
                displayEndTime,
                item.title(),
                TodayEventSummaryResponse.builder()
                        .title(item.title())
                        .content(item.content())
                        .startTime(LocalDateTimeUtil.localTimeToString(displayStartTime))
                        .endTime(LocalDateTimeUtil.localTimeToString(displayEndTime))
                        .build()
        );
    }

    private LocalTime resolveDisplayStartTime(CalendarEventSummaryItem item,
                                              LocalDate occurrenceStartDate,
                                              LocalDate targetDate) {
        if (item.startTime() == null || item.endTime() == null) {
            return null;
        }
        return targetDate.equals(occurrenceStartDate) ? item.startTime() : LocalTime.MIN;
    }

    private LocalTime resolveDisplayEndTime(CalendarEventSummaryItem item,
                                            LocalDate occurrenceEndDate,
                                            LocalDate targetDate) {
        if (item.startTime() == null || item.endTime() == null) {
            return null;
        }
        return targetDate.equals(occurrenceEndDate) ? item.endTime() : LocalTime.MAX;
    }

    private record SummaryItem(
            LocalTime sortStartTime,
            LocalTime sortEndTime,
            String title,
            TodayEventSummaryResponse response
    ) {
    }
}
