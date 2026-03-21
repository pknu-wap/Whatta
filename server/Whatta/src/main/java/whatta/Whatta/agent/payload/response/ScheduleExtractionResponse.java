package whatta.Whatta.agent.payload.response;

import lombok.Builder;
import whatta.Whatta.agent.payload.dto.NormalizedSchedule;

import java.util.List;

@Builder
public record ScheduleExtractionResponse(
        String message,
        List<NormalizedSchedule> schedules
) {
}
