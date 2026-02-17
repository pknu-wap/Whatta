package whatta.Whatta.task.payload.response;

import lombok.Builder;

import whatta.Whatta.user.payload.dto.ReminderNoti;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Builder
public record TaskResponse (

    String id,
    String userId,
    String title,
    String content,
    List<Long> labels,
    Boolean completed,
    LocalDateTime completedAt,
    LocalDate placementDate,
    LocalTime placementTime,
    LocalDateTime dueDateTime,
    Long sortNumber,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    ReminderNoti reminderNoti
){}
