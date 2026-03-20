package whatta.Whatta.agent.util;

import org.junit.jupiter.api.Test;
import whatta.Whatta.agent.payload.dto.NormalizedSchedule;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;

class ScheduleExtractionResultMessageTest {

    @Test
    void warning과_unscheduled가_함께_있으면_부분실패_메시지를_포함한다() {
        NormalizedSchedule scheduledWithWarning = NormalizedSchedule.builder()
                .isScheduled(true)
                .isEvent(true)
                .title("회의")
                .startDate(LocalDate.of(2026, 3, 20))
                .endDate(LocalDate.of(2026, 3, 20))
                .warnings(Map.of("startDate", List.of("3/33")))
                .build();

        NormalizedSchedule unscheduled = NormalizedSchedule.builder()
                .isScheduled(false)
                .isEvent(true)
                .title("또 다른 회의")
                .warnings(Map.of())
                .build();

        String message = ScheduleExtractionResultMessage.from(List.of(scheduledWithWarning, unscheduled));

        assertTrue(message.contains("일정 1개를 만들었어요."));
        assertTrue(message.contains("3/33"));
        assertTrue(message.contains("일부 내용은 이해하지 못했어요."));
    }
}
