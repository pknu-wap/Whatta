package whatta.Whatta.event.payload.response;

import lombok.Builder;
import whatta.Whatta.global.label.Label;
import whatta.Whatta.global.repeat.payload.RepeatResponse;

import java.time.LocalDateTime;
import java.util.List;

@Builder
public record EventDetailsResponse(
        String title,
        String content,
        List<Label> labels,
        boolean isPeriod,
        boolean hasTime,
        boolean isRepeat,
        LocalDateTime startAt,
        LocalDateTime endAt,
        RepeatResponse repeat,
        String colorKey
) {
}
