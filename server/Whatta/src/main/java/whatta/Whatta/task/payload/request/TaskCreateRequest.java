package whatta.Whatta.task.payload.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import whatta.Whatta.global.repeat.payload.RepeatRequest;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Getter
public class TaskCreateRequest {

    private String title;//타이틀
    private String content;//내용

    @Size(max = 3, message = "선택할 수 있는 라벨의 개수는 최대 3개입니다.")
    private List<Long> labels;//라벨

    private LocalDate placementDate;//배치일

    @Schema(type = "string", format = "time", example = "18:00:00")
    private LocalTime placementTime;//배치시간

    private LocalDateTime dueDateTime; //마감일, 마감시간

    @Valid
    private RepeatRequest repeat; //중첩객체 RepeatRequest를 포함

    @NotBlank(message = "일정 타임 박스의 컬러 값은 필수입니다.")
    @Schema(example = "FFFFFF")
    private String colorKey;

}
