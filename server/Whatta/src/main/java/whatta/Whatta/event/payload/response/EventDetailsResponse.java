package whatta.Whatta.event.payload.response;

import lombok.Builder;
import whatta.Whatta.global.label.Label;
import whatta.Whatta.global.label.payload.LabelsResponse;
import whatta.Whatta.global.repeat.payload.RepeatResponse;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Builder
public record EventDetailsResponse(
        String id,
        String title,
        String content,
        LabelsResponse labels,
        LocalDate startDate,
        LocalDate endDate,
        LocalTime startTime,
        LocalTime endTime,
        RepeatResponse repeat,
        String colorKey
) {
}
