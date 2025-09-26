package whatta.Whatta.task.entity;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import whatta.Whatta.global.entity.Repeat;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Document("tasks")
@AllArgsConstructor
@Getter
@Builder(toBuilder = true)
public class Task {

    @Id
    private String id;

    @NotNull
    private String userId;

    @NotBlank
    @Builder.Default
    private String title = "새로운 작업";

    private String content;

    @Builder.Default
    private List<String> labels = new ArrayList<>();

    @Builder.Default
    private boolean completed = false; //진행 전(false) / 완료(true)

    private LocalDate placementDate;//null 유무로 배치 유무를 판단
    private LocalTime placementTime;

    private LocalDateTime dueDateTime;

    @Valid
    private Repeat repeat;

    @NotNull
    @Builder.Default
    private Long orderByNumber = 0L;

    @NotNull
    private String colorKey;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}