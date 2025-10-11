package whatta.Whatta.event.mapper;

import org.springframework.stereotype.Component;
import whatta.Whatta.event.entity.Event;
import whatta.Whatta.event.payload.response.EventDetailsResponse;
import whatta.Whatta.global.label.payload.LabelsResponse;
import whatta.Whatta.global.repeat.payload.RepeatResponse;

@Component
public class EventMapper {
    public EventDetailsResponse toEventDetailsResponse(Event event) {

        return EventDetailsResponse.builder()
                .title(event.getTitle())
                .content(event.getContent())
                .labels(LabelsResponse.fromEntity(event.getLabels()))
                .startDate(event.getStartDate())
                .endDate(event.getEndDate())
                .startTime(event.getStartTime())
                .endTime(event.getEndTime())
                .repeat(RepeatResponse.fromEntity(event.getRepeat()))
                .colorKey(event.getColorKey())
                .build();
    }
}
