package whatta.Whatta.agent.payload.response;

import lombok.Builder;
import whatta.Whatta.agent.payload.dto.NormalizedSchedule;

import java.util.List;

@Builder
public record ScheduleExtractionResponse(
        Integer freeCount, //유료 사용자면 null
        String message,
        List<NormalizedSchedule> schedules
) {
}
