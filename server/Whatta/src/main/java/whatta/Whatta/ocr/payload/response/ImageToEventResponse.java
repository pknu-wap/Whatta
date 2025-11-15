package whatta.Whatta.ocr.payload.response;

import lombok.Builder;

import java.util.List;

@Builder
public record ImageToEventResponse (
        List<ImageToEvent> events
) {
    @Builder
    public record ImageToEvent(
            String title,
            String content,

            String weekDay,
            String startTime, //HH:mm
            String endTime
    ) {}
}
