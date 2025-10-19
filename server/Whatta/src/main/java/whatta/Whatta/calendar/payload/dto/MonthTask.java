package whatta.Whatta.calendar.payload.dto;

import java.util.List;

public record MonthTask(
        String id,
        String title,
        String colorKey,
        List<Long> labels,
        boolean completed
) {
}
