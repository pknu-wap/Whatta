package whatta.Whatta.task.payload.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import whatta.Whatta.global.repeat.payload.RepeatRequest;
import whatta.Whatta.user.payload.dto.ReminderNoti;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public record TaskCreateRequest (

        @Size(max = 20, message = "제목은 20자 이내여야 합니다.")
        @Schema(description = "할 일 제목", example = "장보기")
        String title,

        @Size(max = 100, message = "내용은 100자 이내여야 합니다.")
        @Schema(description = "할 일 내용 (빈 문자열 허용)", example = "우유, 계란, 미나리")
        String content,

        @Size(max = 3, message = "선택할 수 있는 라벨의 개수는 최대 3개입니다.")
        @Schema(description = "라벨 ID 목록")
        List<Long> labels,

        @Schema(description = "배치 날짜 (YYYY-MM-DD)", example = "2026-02-10")
        LocalDate placementDate,

        @Schema(description = "배치 시간 (HH:mm:ss)", example = "18:00:00")
        LocalTime placementTime,

        @Schema(description = "마감 일시", example = "2026-02-10T23:59:00")
        LocalDateTime dueDateTime,

        @Valid
        @Schema(description = "반복 설정")
        RepeatRequest repeat,

        @Schema(description = "알림 설정")
        ReminderNoti reminderNoti
) {}
