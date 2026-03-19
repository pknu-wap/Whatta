package whatta.Whatta.ai.payload.dto;

import lombok.Builder;
import whatta.Whatta.event.payload.response.RepeatResponse;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Builder
public record ScheduleCandidate(
        CandidateType type,
        String title,
        LocalDate startDate,
        LocalDate endDate,
        LocalTime startTime,
        LocalTime endTime,
        LocalDateTime dueDateTime,
        boolean allDay,
        boolean scheduled
) {
    public enum CandidateType {
        EVENT,
        TASK
    }
}
