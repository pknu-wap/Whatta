package whatta.Whatta.event.mapper;

import org.springframework.stereotype.Component;
import whatta.Whatta.event.entity.Event;
import whatta.Whatta.event.payload.response.EventDetailsResponse;
import whatta.Whatta.global.repeat.payload.RepeatResponse;
import whatta.Whatta.global.util.LocalTimeUtil;

@Component
public class EventMapper {
    public EventDetailsResponse toEventDetailsResponse(Event event) {
        return EventDetailsResponse.builder()
                .id(event.getId())
                .title(event.getTitle())
                .content(event.getContent())
                .labels(event.getLabels())
                .startDate(event.getStartDate())
                .endDate(event.getEndDate())
                .startTime(LocalTimeUtil.localTimeToString(event.getStartTime()))
                .endTime(LocalTimeUtil.localTimeToString(event.getEndTime()))
                .repeat(RepeatResponse.fromEntity(event.getRepeat()))
                .colorKey(event.getColorKey())
                .build();
    }
}
