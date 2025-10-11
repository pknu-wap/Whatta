package whatta.Whatta.task.payload.response;

import lombok.Builder;
import lombok.Getter;
import whatta.Whatta.global.payload.response.RepeatResponse;
import whatta.Whatta.task.entity.Task;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Getter
@Builder
public class TaskResponse {

    private final String id;
    private final String userId;
    private final String title;
    private final String content;
    private final List<String> labels;
    private final Boolean completed;
    private final LocalDate placementDate;
    private final LocalTime placementTime;
    private final LocalDateTime dueDateTime;
    private final RepeatResponse repeat;
    private final Long sortNumber;
    private final String colorKey;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;


}
