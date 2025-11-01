package whatta.Whatta.task.payload.request;

import jakarta.validation.Valid;
import lombok.Getter;
import whatta.Whatta.global.repeat.payload.RepeatRequest;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Getter
public class TaskUpdateRequest {

    private String title;//타이틀
    private String content;//내용
    private List<Long> labels;//라벨

    private Boolean completed; //Boolean값은 null값을 가질 수 있음.
    private LocalDateTime completedAt;

    private LocalDate placementDate;//배치일
    private LocalTime placementTime;//배치시간

    private LocalDateTime dueDateTime; //마감일, 마감시간

    @Valid
    private RepeatRequest repeat;

    private Long sortNumber;//정렬

    private List<String> fieldsToClear; //null로 필드 초기화


}
