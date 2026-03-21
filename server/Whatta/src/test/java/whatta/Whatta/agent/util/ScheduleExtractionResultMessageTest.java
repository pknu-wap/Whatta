package whatta.Whatta.agent.util;

import org.junit.jupiter.api.Test;
import whatta.Whatta.agent.payload.dto.NormalizedSchedule;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
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

        assertTrue(message.contains("스케줄 생성을 완료했어요. 다만"));
        assertTrue(message.contains("3/33"));
        assertTrue(message.contains("일부 내용은 이해하지 못했어요."));
    }

    @Test
    void 날짜와_시간_warning이_함께_있으면_한_문장으로_합쳐서_안내한다() {
        NormalizedSchedule scheduledWithTwoWarnings = NormalizedSchedule.builder()
                .isScheduled(true)
                .isEvent(false)
                .title("알고리즘 풀기")
                .startDate(null)
                .endDate(null)
                .startTime(null)
                .endTime(null)
                .warnings(Map.of(
                        "startDate", List.of("3월33일"),
                        "startTime", List.of("25시")
                ))
                .build();

        String message = ScheduleExtractionResultMessage.from(List.of(scheduledWithTwoWarnings));

        assertTrue(message.contains("\"3월33일\"과 \"25시\"는 해석하지 못해서"));
        assertFalse(message.contains("그리고 \"25시\""));
        assertTrue(message.contains("확인 후 수정해주세요."));
    }

    @Test
    void 생성되지_않은_항목이어도_warning이_있으면_warning_기반_안내를_우선한다() {
        NormalizedSchedule unscheduledWithWarning = NormalizedSchedule.builder()
                .isScheduled(false)
                .isEvent(true)
                .title("캡디회의")
                .startDate(null)
                .endDate(null)
                .startTime(null)
                .endTime(null)
                .warnings(Map.of("startDate", List.of("33일")))
                .build();

        String message = ScheduleExtractionResultMessage.from(List.of(unscheduledWithWarning));

        assertTrue(message.startsWith("스케줄 생성을 완료했어요. 다만 "));
        assertTrue(message.contains("\"33일\"은 해석하지 못해서 날짜는 비워뒀어요."));
        assertFalse(message.contains("일부 내용은 이해하지 못했어요."));
    }

    @Test
    void 같은_warning_원문이_여러_항목에_복사돼도_한번만_안내한다() {
        NormalizedSchedule first = NormalizedSchedule.builder()
                .isScheduled(true)
                .isEvent(true)
                .title("캡디회의")
                .startDate(null)
                .endDate(null)
                .warnings(Map.of("startDate", List.of("33일")))
                .build();

        NormalizedSchedule second = NormalizedSchedule.builder()
                .isScheduled(true)
                .isEvent(true)
                .title("왓타회의")
                .startDate(LocalDate.of(2026, 3, 25))
                .endDate(LocalDate.of(2026, 3, 25))
                .warnings(Map.of("startDate", List.of("33일")))
                .build();

        String message = ScheduleExtractionResultMessage.from(List.of(first, second));

        assertTrue(message.contains("\"33일\"은 해석하지 못해서 날짜는 비워뒀어요."));
        assertFalse(message.contains("2026-03-25"));
        assertEquals(1, countOccurrences(message, "\"33일\""));
    }

    private int countOccurrences(String text, String target) {
        int count = 0;
        int index = 0;
        while ((index = text.indexOf(target, index)) >= 0) {
            count++;
            index += target.length();
        }
        return count;
    }
}
