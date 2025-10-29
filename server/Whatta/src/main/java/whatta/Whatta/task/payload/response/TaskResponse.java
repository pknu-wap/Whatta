package whatta.Whatta.task.payload.response;

import lombok.Builder;
import lombok.Getter;
import whatta.Whatta.global.label.payload.LabelsResponse;
import whatta.Whatta.global.repeat.payload.RepeatResponse;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Builder
public class TaskResponse {

    private final String id;
    private final String userId;
    private final String title;
    private final String content;
    private final LabelsResponse labels;
    private final Boolean completed;
    private final LocalDate placementDate;
    private final LocalTime placementTime;
    private final LocalDateTime dueDateTime;
    private final RepeatResponse repeat;
    private final Long sortNumber;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;


}
