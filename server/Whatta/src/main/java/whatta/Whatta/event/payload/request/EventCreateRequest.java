package whatta.Whatta.event.payload.request;


import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import whatta.Whatta.global.payload.request.RepeatRequest;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Getter
public class EventCreateRequest {

    private String title; //최대값 설정
    private String content; //최대값 설정
    @Size(max = 3, message = "선택할 수 있는 라벨의 개수는 최대 3개입니다.")
    private List<String> labels;

    @NotNull(message = "날짜 지정은 필수입니다.")
    private LocalDate startDate;
    @NotNull(message = "날짜 지정은 필수입니다. 기간 설정을 하지 않을 경우, 시작 날짜와 동일해야 합니다.")
    private LocalDate endDate;

    @Schema(type = "string", format = "time", example = "18:00:00")
    private LocalTime startTime;

    @Schema(type = "string", format = "time", example = "18:00:00")
    private LocalTime endTime;

    @Valid
    private RepeatRequest repeat;

    @NotBlank(message = "일정 타임 박스의 컬러 값은 필수입니다.")
    @Schema(example = "FFFFFF")
    private String colorKey;
}
