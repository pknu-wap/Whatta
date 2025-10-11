package whatta.Whatta.event.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.event.entity.Event;
import whatta.Whatta.event.payload.request.EventCreateRequest;
import whatta.Whatta.event.payload.response.EventDetailsResponse;
import whatta.Whatta.event.repository.EventRepository;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.global.repeat.payload.RepeatResponse;
import whatta.Whatta.global.util.LabelUtils;
import whatta.Whatta.user.entity.User;
import whatta.Whatta.user.entity.UserSetting;
import whatta.Whatta.user.repository.UserRepository;
import whatta.Whatta.user.repository.UserSettingRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
@AllArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final UserSettingRepository userSettingRepository;

    public void createEvent(EventCreateRequest request) { //TODO: user 정보 받아와서 함께 db에 저장

        User user = userRepository.findByInstallationId("user123")
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        UserSetting userSetting = userSettingRepository.findByUserId("user123")
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_SETTING_NOT_FOUND));

        //유저의 라벨 목록에 있는 라벨인지
        LabelUtils.validateLabelsInUserSettings(userSetting, request.getLabels());
        validateDateTimeOrder(request.getStartDate(), request.getEndDate(), request.getStartTime(), request.getEndTime());

        Event event = Event.builder()
                .userId(user.getInstallationId()) //임시로 userId가 아닌 installationId로
                .title(request.getTitle())
                .content(request.getContent())
                .labels(LabelUtils.getTitleAndColorKeyByIds(userSetting, request.getLabels()))
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .repeat((request.getRepeat() == null) ? null : request.getRepeat().toEntity())
                .colorKey(request.getColorKey())
                .build();

        eventRepository.save(event);
    }
    private void validateDateTimeOrder(LocalDate startDate, LocalDate endDate, LocalTime startTime, LocalTime endTime) {
        if(startDate != endDate && startDate.isAfter(endDate)) {
            throw new RestApiException(ErrorCode.DATE_ORDER_INVALID);
        }
        if(startTime != null && endTime != null) {
            if(startTime.isAfter(endTime)) {
                throw new RestApiException(ErrorCode.TIME_ORDER_INVALID);
            }
        }
    }

    public EventDetailsResponse getEventDetails(String eventId) {

        Event event = eventRepository.findEventByIdAndUserId(eventId, "user123") //TODO: 게스트 로그인 구현 후, user 정보로 대체
                .orElseThrow(() -> new RestApiException(ErrorCode.EVENT_NOT_FOUNT));

        return EventDetailsResponse.builder()
                .title(event.getTitle())
                .content(event.getContent())
                .labels(event.getLabels())
                .isPeriod(event.isPeriod())
                .hasTime(event.hasTime())
                .isRepeat(event.isRepeat())
                .startAt(buildDateTime(event.getStartDate(), event.getStartTime()))
                .endAt(buildDateTime(event.getEndDate(), event.getEndTime()))
                .repeat(RepeatResponse.fromEntity(event.getRepeat())) //TODO: dto 변환로직 추후 추가
                .colorKey(event.getColorKey())
                .build();
    }

    private LocalDateTime buildDateTime(LocalDate date, LocalTime time) {
        LocalTime t = (time != null) ? time : LocalTime.MIDNIGHT; //시간지정이 없으면 자정으로
        return LocalDateTime.of(date, t);
    }
}
