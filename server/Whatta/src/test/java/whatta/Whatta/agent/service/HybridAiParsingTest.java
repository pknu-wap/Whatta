package whatta.Whatta.agent.service;

import org.junit.jupiter.api.Test;
import whatta.Whatta.agent.payload.dto.NormalizedSchedule;
import whatta.Whatta.agent.payload.dto.RuleBasedExtractionResult;
import whatta.Whatta.agent.payload.dto.ScheduleCandidate;
import whatta.Whatta.agent.spec.ScheduleExtractionSpec;
import whatta.Whatta.agent.service.extractor.RuleBasedExtractor;
import whatta.Whatta.agent.service.normalizer.AgentPostNormalizer;
import whatta.Whatta.agent.service.normalizer.AgentPreNormalizer;
import whatta.Whatta.agent.util.ScheduleTypeRules;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class HybridAiParsingTest {

    private static final Clock FIXED_CLOCK =
            Clock.fixed(Instant.parse("2026-03-14T15:00:00Z"), ScheduleExtractionSpec.KST_ZONE_ID);
    private static final Clock JANUARY_END_CLOCK =
            Clock.fixed(Instant.parse("2026-01-30T15:00:00Z"), ScheduleExtractionSpec.KST_ZONE_ID);

    private final AgentPreNormalizer agentPreNormalizer = new AgentPreNormalizer();
    private final RuleBasedExtractor ruleBasedExtractor = new RuleBasedExtractor(FIXED_CLOCK);
    private final ScheduleCandidateResolver scheduleCandidateResolver = new ScheduleCandidateResolver();
    private final ScheduleValidationService scheduleValidationService = new ScheduleValidationService();
    private final AgentPostNormalizer agentPostNormalizer = new AgentPostNormalizer();

    @Test
    void 전처리기는_자주_쓰는_한국어_축약어를_정규화한다() {
        String normalized = agentPreNormalizer.normalize("낼   7시   캡디 회의 담주");

        assertEquals("내일 7시 캡디 회의 다음주", normalized);
    }

    @Test
    void 전처리기는_입력을_감싼_따옴표를_제거한다() {
        String normalized = agentPreNormalizer.normalize("\"내일 오후6시에 왓타회의 추가\"");

        assertEquals("내일 오후6시에 왓타회의 추가", normalized);
    }

    @Test
    void 전처리기는_요일_축약어를_정규화한다() {
        String normalized = agentPreNormalizer.normalize("수욜 7시에 왓타회의 추가해줘");

        assertEquals("수요일 7시에 왓타회의 추가해줘", normalized);
    }

    @Test
    void 전처리기는_줄바꿈을_보존하고_줄내_공백만_정리한다() {
        String normalized = agentPreNormalizer.normalize("내일 12시에  \n   캡디 회의   추가해줘");

        assertEquals("내일 12시에\n캡디 회의 추가해줘", normalized);
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
    void 줄바꿈이_있어도_한_일정_문맥이면_멀티일정으로_보지_않는다() {
        String normalized = agentPreNormalizer.normalize("내일 12시에\n캡디 회의 추가해줘");

        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("내일 12시에\n캡디 회의 추가해줘", normalized);

        assertFalse(parsed.hasMultipleItems());
        assertTrue(parsed.hasSingleDate());
        assertTrue(parsed.hasSingleTime());
        assertEquals("캡디 회의", parsed.titleHint());
    }

    @Test
    void 각_줄이_독립적인_일정이면_멀티일정으로_감지한다() {
        String normalized = agentPreNormalizer.normalize("내일 7시 회의\n금요일 과제 제출");

        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("내일 7시 회의\n금요일 과제 제출", normalized);

        assertTrue(parsed.hasMultipleItems());
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
    void 룰기반추출기는_문장끝_구두점이_붙은_명령형_접미어도_제거한다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("내일 11시 캡디 회의 추가해줘.", "내일 11시 캡디 회의 추가해줘.");

        assertEquals("캡디 회의", parsed.titleHint());
    }

    @Test
    void 룰기반추출기는_월일_표현을_절대날짜로_파싱한다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("11월 12일에 언니생일 추가", "11월 12일에 언니생일 추가");

        assertTrue(parsed.hasSingleDate());
        assertTrue(parsed.isAllDay());
        assertEquals(LocalDate.of(2026, 11, 12), parsed.dateCandidates().get(0));
        assertEquals("언니생일", parsed.titleHint());
        assertFalse(parsed.hasRepeatExpression());
    }

    @Test
    void 룰기반추출기는_일주일뒤_표현을_절대날짜로_계산한다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("일주일뒤에 7시에 캡디 과제 제출", "일주일뒤에 7시에 캡디 과제 제출");

        assertTrue(parsed.hasSingleDate());
        assertTrue(parsed.hasSingleTime());
        assertEquals(LocalDate.of(2026, 3, 22), parsed.dateCandidates().get(0));
        assertEquals(LocalTime.of(7, 0), parsed.timeCandidates().get(0));
        assertEquals("캡디 과제 제출", parsed.titleHint());
    }

    @Test
    void 룰기반추출기는_이틀뒤와_사흘뒤_표현을_절대날짜로_계산한다() {
        RuleBasedExtractionResult twoDaysLater = ruleBasedExtractor.extract("이틀뒤 회의", "이틀뒤 회의");
        RuleBasedExtractionResult threeDaysLater = ruleBasedExtractor.extract("사흘뒤 회의", "사흘뒤 회의");

        assertEquals(LocalDate.of(2026, 3, 17), twoDaysLater.dateCandidates().get(0));
        assertEquals(LocalDate.of(2026, 3, 18), threeDaysLater.dateCandidates().get(0));
    }

    @Test
    void 룰기반추출기는_n일뒤와_n주뒤_표현을_절대날짜로_계산한다() {
        RuleBasedExtractionResult daysLater = ruleBasedExtractor.extract("5일뒤 일정", "5일뒤 일정");
        RuleBasedExtractionResult weeksLater = ruleBasedExtractor.extract("2주뒤 일정", "2주뒤 일정");

        assertEquals(LocalDate.of(2026, 3, 20), daysLater.dateCandidates().get(0));
        assertEquals(LocalDate.of(2026, 3, 29), weeksLater.dateCandidates().get(0));
    }

    @Test
    void 룰기반추출기는_상대일과_기간표현을_day_only_날짜로_오인하지_않는다() {
        RuleBasedExtractionResult relativeAfter = ruleBasedExtractor.extract("3일 후 회의", "3일 후 회의");
        RuleBasedExtractionResult durationDays = ruleBasedExtractor.extract("2일간 집중 공부", "2일간 집중 공부");
        RuleBasedExtractionResult ordinalDays = ruleBasedExtractor.extract("5일째 여행", "5일째 여행");
        RuleBasedExtractionResult quantityDays = ruleBasedExtractor.extract("1일치 보고서 정리", "1일치 보고서 정리");
        RuleBasedExtractionResult sizedDays = ruleBasedExtractor.extract("3일짜리 워크숍", "3일짜리 워크숍");

        assertTrue(relativeAfter.dateCandidates().isEmpty());
        assertTrue(durationDays.dateCandidates().isEmpty());
        assertTrue(ordinalDays.dateCandidates().isEmpty());
        assertTrue(quantityDays.dateCandidates().isEmpty());
        assertTrue(sizedDays.dateCandidates().isEmpty());
    }

    @Test
    void 룰기반추출기는_이번주_요일을_현재_주기준으로_계산한다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("이번주 월요일 회의", "이번주 월요일 회의");

        assertTrue(parsed.hasSingleDate());
        assertEquals(LocalDate.of(2026, 3, 9), parsed.dateCandidates().get(0));
    }

    @Test
    void 룰기반추출기는_다음주_요일을_다음_주기준으로_계산한다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("다음주 월요일 회의", "다음주 월요일 회의");

        assertTrue(parsed.hasSingleDate());
        assertEquals(LocalDate.of(2026, 3, 16), parsed.dateCandidates().get(0));
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
    void 룰기반추출기는_일만_있는_마감표현도_날짜로_파싱한다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract(
                "25일 23시까지 알고리즘 풀기 추가",
                "25일 23시까지 알고리즘 풀기 추가"
        );

        ScheduleCandidate candidate = scheduleCandidateResolver.resolve(parsed);

        assertEquals(LocalDate.of(2026, 3, 25), parsed.deadlineCandidate());
        assertNotNull(candidate);
        assertEquals(ScheduleCandidate.CandidateType.TASK, candidate.type());
        assertTrue(candidate.scheduled());
        assertEquals(LocalDate.of(2026, 3, 25), candidate.startDate());
        assertEquals(LocalDate.of(2026, 3, 25), candidate.endDate());
        assertEquals(LocalTime.of(23, 0), candidate.startTime());
        assertEquals(LocalTime.of(23, 0), candidate.dueDateTime().toLocalTime());
    }

    @Test
    void 잘못된_일만_있는_날짜도_warning으로_남긴다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract(
                "33일 25시까지 알고리즘 풀기",
                "33일 25시까지 알고리즘 풀기"
        );

        assertEquals(List.of("33일"), parsed.warnings().get("startDate"));
        assertEquals(List.of("25시"), parsed.warnings().get("startTime"));
    }

    @Test
    void 다음달에_없는_일자면_day_only_날짜를_warning으로_남긴다() {
        RuleBasedExtractor januaryExtractor = new RuleBasedExtractor(JANUARY_END_CLOCK);

        RuleBasedExtractionResult parsed = januaryExtractor.extract(
                "30일 23시까지 알고리즘 풀기",
                "30일 23시까지 알고리즘 풀기"
        );

        assertTrue(parsed.dateCandidates().isEmpty());
        assertEquals(List.of("30일"), parsed.warnings().get("startDate"));
    }

    @Test
    void 잘못된_날짜와_마감시간이_함께_있으면_오늘_마감으로_확정하지_않는다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("3월33일 22시까지 알고리즘 풀기 추가", "3월33일 22시까지 알고리즘 풀기 추가");

        ScheduleCandidate candidate = scheduleCandidateResolver.resolve(parsed);

        assertNotNull(candidate);
        assertEquals(ScheduleCandidate.CandidateType.TASK, candidate.type());
        assertTrue(candidate.scheduled());
        assertNull(candidate.startDate());
        assertNull(candidate.endDate());
        assertEquals(LocalTime.of(22, 0), candidate.startTime());
        assertEquals(LocalTime.of(23, 0), candidate.endTime());
        assertNull(candidate.dueDateTime());
        assertNull(parsed.deadlineCandidate());
        assertEquals(List.of("3월33일"), parsed.warnings().get("startDate"));
    }

    @Test
    void 룰기반추출기는_다음주_단독표현만으로는_date_candidate를_만들지_않는다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("다음주에 7시 캡디 회의 추가", "다음주에 7시 캡디 회의 추가");

        assertTrue(parsed.dateCandidates().isEmpty());
        assertTrue(parsed.hasSingleTime());
        assertEquals("캡디 회의", parsed.titleHint());
    }

    @Test
    void 룰기반추출기는_반복표현을_감지만_한다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("매주 수요일마다 회의", "매주 수요일마다 회의");

        assertTrue(parsed.hasRepeatExpression());
    }

    @Test
    void 날짜_언급이_없고_시간만_있으면_event를_rule_path로_확정하지_않는다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("오후 1시에 프론트랑 회의", "오후 1시에 프론트랑 회의");

        ScheduleCandidate candidate = scheduleCandidateResolver.resolve(parsed);

        assertNull(candidate);
    }

    @Test
    void 룰기반추출기는_잘못된_날짜와_시간을_건너뛰고_warning을_남긴다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("2026-13-40 25시 회의", "2026-13-40 25시 회의");

        assertTrue(parsed.dateCandidates().isEmpty());
        assertTrue(parsed.timeCandidates().isEmpty());
        assertEquals(List.of("2026-13-40"), parsed.warnings().get("startDate"));
        assertEquals(List.of("25시"), parsed.warnings().get("startTime"));
    }

    @Test
    void 잘못된_날짜_warning이_있어도_title이_있으면_미확정_rule_응답을_생성한다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("3/33 캡디 회의 추가", "3/33 캡디 회의 추가");

        ScheduleCandidate candidate = scheduleCandidateResolver.resolve(parsed);

        assertNotNull(candidate);
        assertEquals(ScheduleCandidate.CandidateType.EVENT, candidate.type());
        assertFalse(candidate.scheduled());
        assertEquals("캡디 회의", candidate.title());
        assertEquals(List.of("3/33"), parsed.warnings().get("startDate"));
    }

    @Test
    void 잘못된_날짜와_유효한_시간이_함께_있으면_오늘_날짜를_채우지_않고_미확정으로_둔다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("3/33 7시 캡디 회의 추가", "3/33 7시 캡디 회의 추가");

        ScheduleCandidate candidate = scheduleCandidateResolver.resolve(parsed);

        assertNotNull(candidate);
        assertFalse(candidate.scheduled());
        assertNull(candidate.startDate());
        assertNull(candidate.endDate());
        assertEquals(LocalTime.of(7, 0), candidate.startTime());
        assertEquals(LocalTime.of(8, 0), candidate.endTime());
        assertEquals(List.of("3/33"), parsed.warnings().get("startDate"));
    }

    @Test
    void 잘못된_startDate_warning이_있고_유효한_날짜_후보가_없으면_최종응답에도_오늘날짜를_채우지_않는다() {
        RuleBasedExtractionResult parsed = ruleBasedExtractor.extract("3/33 7시 캡디 회의 추가", "3/33 7시 캡디 회의 추가");

        ScheduleCandidate candidate = scheduleCandidateResolver.resolve(parsed);
        NormalizedSchedule normalizedSchedule = agentPostNormalizer.normalizeRuleBasedCandidate(candidate, parsed.warnings());

        assertNotNull(normalizedSchedule);
        assertFalse(normalizedSchedule.isScheduled());
        assertTrue(normalizedSchedule.isEvent());
        assertNull(normalizedSchedule.startDate());
        assertNull(normalizedSchedule.endDate());
        assertEquals(LocalTime.of(7, 0), normalizedSchedule.startTime());
        assertEquals(LocalTime.of(8, 0), normalizedSchedule.endTime());
        assertEquals(List.of("3/33"), normalizedSchedule.warnings().get("startDate"));
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

    @Test
    void task_title_rule은_단순히_기로_끝나는_명사형_제목을_task로_보지_않는다() {
        assertFalse(ScheduleTypeRules.looksLikeTaskTitle("정기 회의"));
        assertFalse(ScheduleTypeRules.looksLikeTaskTitle("후기"));
        assertTrue(ScheduleTypeRules.looksLikeTaskTitle("알고리즘 풀기"));
    }
}
