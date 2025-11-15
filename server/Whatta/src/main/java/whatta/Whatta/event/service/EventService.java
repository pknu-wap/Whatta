package whatta.Whatta.event.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.event.entity.Event;
import whatta.Whatta.event.mapper.EventMapper;
import whatta.Whatta.event.payload.request.EventCreateRequest;
import whatta.Whatta.event.payload.request.EventUpdateRequest;
import whatta.Whatta.event.payload.response.EventDetailsResponse;
import whatta.Whatta.event.repository.EventRepository;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.global.util.LabelUtil;
import whatta.Whatta.global.util.LocalTimeUtil;
import whatta.Whatta.user.entity.User;
import whatta.Whatta.user.entity.UserSetting;
import whatta.Whatta.user.repository.UserRepository;
import whatta.Whatta.user.repository.UserSettingRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;

@Service
@AllArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final UserSettingRepository userSettingRepository;
    private final EventMapper eventMapper;

    public EventDetailsResponse createEvent(String userId, EventCreateRequest request) {

        User user = userRepository.findUserById(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_SETTING_NOT_FOUND));

        //유저의 라벨 목록에 있는 라벨인지
        LabelUtil.validateLabelsInUserSettings(userSetting, request.labels());

        LocalTime startTime = LocalTimeUtil.stringToLocalTime(request.startTime());
        LocalTime endTime = LocalTimeUtil.stringToLocalTime(request.endTime());
        validateDateTimeOrder(request.startDate(), request.endDate(), startTime, endTime);

        Event.EventBuilder eventBuilder = Event.builder()
                .userId(user.getId())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .repeat((request.repeat() == null) ? null : request.repeat().toEntity())
                .colorKey(request.colorKey());
        if(request.title() != null && !request.title().isBlank()) eventBuilder.title(request.title());
        if(request.content() != null && !request.content().isBlank()) eventBuilder.content(request.content());
        if(request.labels() != null && !request.labels().isEmpty()) eventBuilder.labels(request.labels());
        if(request.startTime() != null && request.endTime() != null) {
            eventBuilder.startTime(startTime);
            eventBuilder.endTime(endTime);
        }

       return eventMapper.toEventDetailsResponse(eventRepository.save(eventBuilder.build()));
    }
    private void validateDateTimeOrder(LocalDate startDate, LocalDate endDate, LocalTime startTime, LocalTime endTime) {
        if(startDate.isAfter(endDate)) {
            throw new RestApiException(ErrorCode.DATE_ORDER_INVALID);
        }
        if(startDate.equals(endDate) && startTime != null && endTime != null) {
            if(startTime.isAfter(endTime)) {
                throw new RestApiException(ErrorCode.TIME_ORDER_INVALID);
            }
        }
    }

    public EventDetailsResponse getEventDetails(String userId, String eventId) {

        Event event = eventRepository.findEventByIdAndUserId(eventId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.EVENT_NOT_FOUND));

        return eventMapper.toEventDetailsResponse(event);
    }

    public EventDetailsResponse updateEvent(String userId, String eventId, EventUpdateRequest request) {

        Event originalEvent = eventRepository.findEventByIdAndUserId(eventId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.EVENT_NOT_FOUND));

        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_SETTING_NOT_FOUND));

        LocalTime startTime = LocalTimeUtil.stringToLocalTime(request.startTime());
        LocalTime endTime = LocalTimeUtil.stringToLocalTime(request.endTime());
        System.out.println("editing : " + endTime);
        validateDateTimeOrder(request.startDate(), request.endDate(), startTime, endTime);

        //수정
        Event.EventBuilder builder = originalEvent.toBuilder();
        if(request.title() != null && !request.title().isBlank()) builder.title(request.title());
        if(request.content() != null && !request.content().isBlank()) builder.content(request.content());
        if(request.labels() != null && !request.labels().isEmpty()) {
            LabelUtil.validateLabelsInUserSettings(userSetting, request.labels());
            builder.labels(request.labels());
        }
        if(request.startDate() != null) builder.startDate(request.startDate());
        if(request.endDate() != null) builder.endDate(request.endDate());
        if(request.startTime() != null) builder.startTime(startTime);
        if(request.endTime() != null) builder.endTime(endTime);
        if(request.repeat() != null) builder.repeat(request.repeat().toEntity());
        if(request.colorKey() != null) builder.colorKey(request.colorKey());

        //명시된 field를 초기화
        //혹시라도 특정필드 수정요청과 초기화를 같이 모순되게 보낼경우 초기화가 우선됨
        if(request.fieldsToClear() != null && !request.fieldsToClear().isEmpty()) {
            for (String fieldName : request.fieldsToClear()) {
                switch (fieldName) { //date와 colorkey는 null로 초기화 안함
                    case "title": //TODO: enum
                        builder.title("새로운 일정");
                        break;
                    case "content":
                        builder.content("");
                        break;
                    case "labels":
                        builder.labels(new ArrayList<>());
                        break;
                    case "startTime":
                        builder.startTime(null);
                        break;
                    case "endTime":
                        builder.endTime(null);
                        break;
                    case "repeat":
                        builder.repeat(null);
                        break;
                }
            }
        }
        builder.editedAt(LocalDateTime.now());

        return eventMapper.toEventDetailsResponse(eventRepository.save(builder.build()));
    }

    public void deleteEvent(String userId, String eventId) {
        Event event = eventRepository.findEventByIdAndUserId(eventId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.EVENT_NOT_FOUND));

        eventRepository.delete(event);
    }
}
