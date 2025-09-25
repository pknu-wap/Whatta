package whatta.Whatta.task.payload.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import whatta.Whatta.task.entity.Task;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Getter
public class TaskCreateRequest {

    @NotBlank(message = "제목을 입력해주세요.")
    private String title;//타이틀

    private String content;//내용
    private List<String> labels;//라벨

    @NotNull(message = "진행상태를 입력해주세요.")
    private boolean completed; //기본은 false

    private LocalDate placementDate;//배치일
    private LocalTime placementTime;//배치시간

    private LocalDateTime dueDateTime; //마감일, 마감시간

    private Long orderByNumber;//정렬

    @NotNull(message = "색상을 입력해주세요.")
    private String colorKey;

    public Task toEntity(String userId){
        return Task.builder()
                .userId(userId)
                .title(title)
                .content(content)
                .labels(labels)
                .completed(completed)
                .placementDate(placementDate)
                .placementTime(placementTime)
                .dueDateTime(dueDateTime)
                .orderByNumber(orderByNumber)
                .colorKey(colorKey)
                .build();
    }


}
