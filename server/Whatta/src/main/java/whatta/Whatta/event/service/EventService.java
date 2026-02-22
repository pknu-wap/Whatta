package whatta.Whatta.event.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import whatta.Whatta.event.entity.Event;
import whatta.Whatta.event.enums.EventClearField;
import whatta.Whatta.event.mapper.EventMapper;
import whatta.Whatta.event.payload.request.EventCreateRequest;
import whatta.Whatta.event.payload.request.EventUpdateRequest;
import whatta.Whatta.event.payload.response.EventResponse;
import whatta.Whatta.event.repository.EventRepository;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.global.util.LabelUtil;
import whatta.Whatta.global.util.LocalTimeUtil;
import whatta.Whatta.notification.service.ReminderNotiService;
import whatta.Whatta.user.entity.User;
import whatta.Whatta.user.entity.UserSetting;
import whatta.Whatta.user.repository.UserRepository;
import whatta.Whatta.user.repository.UserSettingRepository;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.EnumSet;

@Service
@AllArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
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
                .repeat(request.repeat().toEntity())
                .colorKey(request.colorKey());
        if(request.title() != null && !request.title().isBlank()) eventBuilder.title(request.title());
        if(request.content() != null && !request.content().isBlank()) eventBuilder.content(request.content());
        if(request.labels() != null && !request.labels().isEmpty()) eventBuilder.labels(request.labels());
        eventBuilder.startTime(LocalTimeUtil.stringToLocalTime(request.startTime()));
        eventBuilder.endTime(LocalTimeUtil.stringToLocalTime(request.endTime()));
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
        return LocalTimeUtil.stringToLocalTime(time);
    }

    private boolean shouldDeleteBecauseStartAfterRepeatEnd(Event event) {
        if (event.getRepeat() == null) return false;
        if (event.getRepeat().getEndDate() == null) return false;
        return event.getStartDate().isAfter(event.getRepeat().getEndDate());
    }

    @Transactional
    public void deleteEvent(String userId, String eventId) {
        Event event = eventRepository.findEventByIdAndUserId(eventId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.EVENT_NOT_FOUND));

        scheduledNotiService.cancelReminderNotification(eventId);
        eventRepository.delete(event);
    }
}
