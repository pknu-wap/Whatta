package whatta.Whatta.task.mapper;

import org.springframework.stereotype.Component;
import whatta.Whatta.task.entity.Task;
import whatta.Whatta.task.payload.response.SidebarTaskResponse;
import whatta.Whatta.task.payload.response.TaskResponse;

@Component
public class TaskMapper {
    public TaskResponse toResponse(Task task) {
        return TaskResponse.builder()
                .id(task.getId())
                .userId(task.getUserId())
                .title(task.getTitle())
                .content(task.getContent())
                .labels(task.getLabels())
                .completed(task.getCompleted())
                .completedAt(task.getCompletedAt())
                .placementDate(task.getPlacementDate())
                .placementTime(task.getPlacementTime())
                .dueDateTime(task.getDueDateTime())
                .sortNumber(task.getSortNumber())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .reminderNoti(task.getReminderNotiAt())
                .build();
    }

    public SidebarTaskResponse toSidebarResponse(Task task) {
        return new SidebarTaskResponse(
                task.getId(),
                task.getTitle(),
                task.getCompleted(),
                task.getCompletedAt(),
                task.getDueDateTime(),
                task.getSortNumber()
        );

    }

}
