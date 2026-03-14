package whatta.Whatta.ai.service;

import org.junit.jupiter.api.Test;
import whatta.Whatta.ai.payload.dto.NormalizedSchedule;
import whatta.Whatta.ai.payload.dto.RuleBasedExtractionResult;
import whatta.Whatta.ai.payload.dto.ScheduleCandidate;
import whatta.Whatta.ai.service.extracor.RuleBasedExtractor;
import whatta.Whatta.ai.service.normalizer.AIPreNormalizer;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;

class HybridAiParsingTest {

    private final AIPreNormalizer aiPreNormalizer = new AIPreNormalizer();
    private final RuleBasedExtractor ruleBasedExtractor = new RuleBasedExtractor();
    private final ScheduleCandidateResolver scheduleCandidateResolver = new ScheduleCandidateResolver();
    private final ScheduleValidationService scheduleValidationService = new ScheduleValidationService();

    @Test
    void 전처리기는_자주_쓰는_한국어_축약어를_정규화한다() {
        String normalized = aiPreNormalizer.normalize("낼   7시   캡디 회의 담주");

        assertEquals("내일 7시 캡디 회의 다음주", normalized);
    }

    @Test
    void 전처리기는_입력을_감싼_따옴표를_제거한다() {
        String normalized = aiPreNormalizer.normalize("\"내일 오후6시에 왓타회의 추가\"");

        assertEquals("내일 오후6시에 왓타회의 추가", normalized);
    }

    @Test
    void 전처리기는_요일_축약어를_정규화한다() {
        String normalized = aiPreNormalizer.normalize("수욜 7시에 왓타회의 추가해줘");

        assertEquals("수요일 7시에 왓타회의 추가해줘", normalized);
    }

    @Test
    void 룰기반추출기는_단순한_일정_입력에서_날짜와_시간을_추출한다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("내일 7시 캡디 회의", "내일 7시 캡디 회의");

        assertTrue(parsed.hasSingleDate());
        assertTrue(parsed.hasSingleTime());
        assertEquals(LocalTime.of(7, 0), parsed.timeCandidates().get(0));
        assertEquals("캡디 회의", parsed.titleHint());
    }

    @Test
    void 후보리졸버는_마감기한_입력으로부터_task_후보를_생성한다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("금요일까지 보고서 제출", "금요일까지 보고서 제출");

        ScheduleCandidate candidate = scheduleCandidateResolver.resolve(parsed);

        assertNotNull(candidate);
        assertEquals(ScheduleCandidate.CandidateType.TASK, candidate.type());
        assertEquals("보고서 제출", candidate.title());
        assertNotNull(candidate.dueDateTime());
    }

    @Test
    void 룰기반추출기는_title에서_조사와_명령형_접미어를_제거한다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("내일 오후6시에 왓타회의 추가", "내일 오후6시에 왓타회의 추가");

        assertEquals("왓타회의", parsed.titleHint());
    }

    @Test
    void 룰기반추출기는_title에서_요일과_남은_조사를_제거한다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("수요일 7시에 왓타회의 추가해줘", "수요일 7시에 왓타회의 추가해줘");

        assertTrue(parsed.hasSingleDate());
        assertTrue(parsed.hasSingleTime());
        assertEquals("왓타회의", parsed.titleHint());
    }

    @Test
    void 룰기반추출기는_월일_표현을_절대날짜로_파싱한다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("11월 12일에 언니생일 추가", "11월 12일에 언니생일 추가");

        assertTrue(parsed.hasSingleDate());
        assertEquals(LocalDate.of(2026, 11, 12), parsed.dateCandidates().get(0));
        assertEquals("언니생일", parsed.titleHint());
        assertFalse(parsed.hasRepeatExpression());
    }

    @Test
    void 마감기한_입력은_title에서_마감표현을_제거하고_task_후보가_된다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("내일 11시 전까지 브랜드전략 과제 제출", "내일 11시 전까지 브랜드전략 과제 제출");

        assertEquals(LocalDate.of(2026, 3, 16), parsed.deadlineCandidate());
        assertEquals("브랜드전략 과제 제출", parsed.titleHint());

        ScheduleCandidate candidate = scheduleCandidateResolver.resolve(parsed);
        assertNotNull(candidate);
        assertEquals(ScheduleCandidate.CandidateType.TASK, candidate.type());
        assertNotNull(candidate.dueDateTime());
        assertEquals(LocalTime.of(11, 0), candidate.dueDateTime().toLocalTime());
    }

    @Test
    void 룰기반추출기는_반복표현을_감지만_한다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("매주 수요일마다 회의", "매주 수요일마다 회의");

        assertTrue(parsed.hasRepeatExpression());
    }

    @Test
    void 날짜_언급이_없고_시간만_있으면_오늘_일정으로_처리한다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("오후 1시에 프론트랑 회의", "오후 1시에 프론트랑 회의");

        ScheduleCandidate candidate = scheduleCandidateResolver.resolve(parsed);

        assertNotNull(candidate);
        assertEquals(ScheduleCandidate.CandidateType.EVENT, candidate.type());
        assertEquals(LocalDate.of(2026, 3, 15), candidate.startDate());
        assertEquals(LocalTime.of(13, 0), candidate.startTime());
        assertEquals(LocalTime.of(14, 0), candidate.endTime());
        assertEquals("프론트랑 회의", candidate.title());
    }

    @Test
    void 검증기는_유효하지_않은_llm_일정_event를_거부한다() {
        NormalizedSchedule invalidEvent = NormalizedSchedule.builder()
                .isScheduled(true)
                .isEvent(true)
                .title("회의")
                .startDate(null)
                .endDate(null)
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(11, 0))
                .dueDateTime(null)
                .repeat(null)
                .build();

        assertFalse(scheduleValidationService.isValidNormalizedSchedule(invalidEvent));
    }

    @Test
    void 검증기는_유효하지_않은_llm_일정_task를_거부한다() {
        NormalizedSchedule invalidTask = NormalizedSchedule.builder()
                .isScheduled(true)
                .isEvent(false)
                .title("과제 제출")
                .startDate(null)
                .endDate(null)
                .startTime(null)
                .endTime(null)
                .dueDateTime(null)
                .repeat(null)
                .build();

        assertFalse(scheduleValidationService.isValidNormalizedSchedule(invalidTask));
    }

    @Test
    void 검증기는_유효한_llm_일정_task를_허용한다() {
        NormalizedSchedule validTask = NormalizedSchedule.builder()
                .isScheduled(true)
                .isEvent(false)
                .title("과제 제출")
                .startDate(LocalDate.of(2026, 3, 15))
                .endDate(LocalDate.of(2026, 3, 15))
                .startTime(LocalTime.of(11, 0))
                .endTime(LocalTime.of(12, 0))
                .dueDateTime(LocalDateTime.of(2026, 3, 15, 11, 0))
                .repeat(null)
                .build();

        assertTrue(scheduleValidationService.isValidNormalizedSchedule(validTask));
    }
}
