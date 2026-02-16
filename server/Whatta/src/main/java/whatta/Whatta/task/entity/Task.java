package whatta.Whatta.task.entity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;
import whatta.Whatta.global.repeat.Repeat;
import whatta.Whatta.user.payload.dto.ReminderNoti;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "tasks")
@AllArgsConstructor
@Getter
@Builder(toBuilder = true)
public class Task {

    public static final String DEFAULT_TITLE = "새로운 작업";
    public static final String DEFAULT_CONTENT = "";

    @Id
    private String id;

    @NotNull
    private String userId;

    @NotBlank
    @Builder.Default
    private String title = DEFAULT_TITLE;

    @NotNull
    @Builder.Default
    private String content = DEFAULT_CONTENT;

    @NotNull
    @Builder.Default
    private List<Long> labels = new ArrayList<>();

    @Builder.Default
    private Boolean completed = false; //진행 전(false) / 완료(true)

    @Builder.Default
    private LocalDateTime completedAt = null; //생성 시 null, 완료되면 현재 시각으로 설정

    private LocalDate placementDate; //null 유무로 배치 유무를 판단
    private LocalTime placementTime;
    private LocalDateTime dueDateTime;
    private Repeat repeat;

    @NotNull
    @Builder.Default
    private Long sortNumber = 0L;

    @Builder.Default
    private ReminderNoti reminderNotiAt = null;

    @CreatedDate
    private LocalDateTime createdAt;
    @LastModifiedDate
    private LocalDateTime updatedAt;
}