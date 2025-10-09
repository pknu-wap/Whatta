package whatta.Whatta.task.mapper;

import org.springframework.stereotype.Component;
import whatta.Whatta.global.payload.response.RepeatResponse;
import whatta.Whatta.task.entity.Task;
import whatta.Whatta.task.payload.request.TaskCreateRequest;
import whatta.Whatta.task.payload.response.SidebarTaskResponse;
import whatta.Whatta.task.payload.response.TaskResponse;

@Component
public class TaskMapper {
    public Task toEntity(TaskCreateRequest request, String userId){
        //title이 null이나 blank면 기본값을 줌
        String title = (request.getTitle() == null || request.getTitle().isBlank())
                ? "새로운 작업"
                : request.getTitle();

        return Task.builder()
                .userId(userId)
                .title(title)
                .content(request.getContent())
                .labels(request.getLabels())
                .completed(false)
                .placementDate(request.getPlacementDate())
                .placementTime(request.getPlacementTime())
                .dueDateTime(request.getDueDateTime())
                .repeat(request.getRepeat().toEntity())
                .colorKey(request.getColorKey())
                .build();
    }

    public TaskResponse toResponse(Task task) {
        return TaskResponse.builder()
                .id(task.getId())
                .userId(task.getUserId())
                .title(task.getTitle())
                .content(task.getContent())
                .labels(task.getLabels())
                .completed(task.getCompleted())
                .placementDate(task.getPlacementDate())
                .placementTime(task.getPlacementTime())
                .dueDateTime(task.getDueDateTime())
                .repeat(RepeatResponse.fromEntity(task.getRepeat()))
                .orderByNumber(task.getOrderByNumber())
                .colorKey(task.getColorKey())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }

    public SidebarTaskResponse toSidebarResponse(Task task) {
        return SidebarTaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .completed(task.getCompleted())
                .dueDateTime(task.getDueDateTime())
                .orderByNumber(task.getOrderByNumber())
                .build();

    }

}
