package whatta.Whatta.agent.payload.dto;

import lombok.Builder;

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
