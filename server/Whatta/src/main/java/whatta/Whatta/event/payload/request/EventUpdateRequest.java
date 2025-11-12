package whatta.Whatta.event.payload.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import whatta.Whatta.global.repeat.payload.RepeatRequest;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record EventUpdateRequest(
        String title, //최대값 설정
        String content,

        @Size(max = 3, message = "선택할 수 있는 라벨의 개수는 최대 3개입니다.")
        List<Long> labels,

        LocalDate startDate,
        LocalDate endDate,

        @Schema(type = "string", format = "time", example = "18:00:00")
        LocalTime  startTime,
        @Schema(type = "string", format = "time", example = "18:00:00")
        LocalTime endTime,

        @Valid
        RepeatRequest repeat,
        @Schema(example = "FFFFFF")
        String colorKey,

        List<String> fieldsToClear //필드 초기화
) {
}
