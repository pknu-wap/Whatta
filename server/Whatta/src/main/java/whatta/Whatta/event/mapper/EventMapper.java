package whatta.Whatta.event.mapper;

import org.springframework.stereotype.Component;
import whatta.Whatta.event.entity.Event;
import whatta.Whatta.event.payload.response.EventResponse;
import whatta.Whatta.event.payload.response.RepeatResponse;
import whatta.Whatta.global.util.LocalDateTimeUtil;

@Component
public class EventMapper {
    public EventResponse toEventDetailsResponse(Event event) {
        return EventResponse.builder()
                .id(event.getId())
                .title(event.getTitle())
                .content(event.getContent())
                .labels(event.getLabels())
                .startDate(event.getStartDate())
                .endDate(event.getEndDate())
                .startTime(LocalDateTimeUtil.localTimeToString(event.getStartTime()))
                .endTime(LocalDateTimeUtil.localTimeToString(event.getEndTime()))
                .repeat(RepeatResponse.fromEntity(event.getRepeat()))
                .colorKey(event.getColorKey())
                .reminderNoti(event.getReminderNotiAt())
                .build();
    }
}
