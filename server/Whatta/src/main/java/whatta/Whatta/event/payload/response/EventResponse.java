package whatta.Whatta.event.payload.response;

import lombok.Builder;
import whatta.Whatta.user.payload.dto.ReminderNoti;

import java.time.LocalDate;
import java.util.List;

@Builder
public record EventResponse(
        String id,
        String title,
        String content,
        List<Long> labels,
        LocalDate startDate,
        LocalDate endDate,
        String startTime,
        String endTime,
        RepeatResponse repeat,
        String colorKey,
        ReminderNoti reminderNoti
) {
}
