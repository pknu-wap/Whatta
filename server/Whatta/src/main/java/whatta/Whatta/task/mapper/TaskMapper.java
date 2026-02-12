package whatta.Whatta.task.mapper;

import org.springframework.stereotype.Component;
import whatta.Whatta.task.entity.Task;
import whatta.Whatta.task.payload.request.TaskCreateRequest;
import whatta.Whatta.task.payload.response.SidebarTaskResponse;
import whatta.Whatta.task.payload.response.TaskResponse;
import whatta.Whatta.user.entity.UserSetting;

@Component
public class TaskMapper {
    public Task toEntity(TaskCreateRequest request, UserSetting userSetting){

        return Task.builder()
                .userId(userSetting.getUserId())
                .title(request.title())
                .content(request.content())
                .completed(false)
                .completedAt(null)
                .placementDate(request.placementDate())
                .placementTime(request.placementTime())
                .dueDateTime(request.dueDateTime())
                //.repeat((request.getRepeat() == null)? null : request.getRepeat().toEntity()) //null 검사는 호출하는 쪽에서
                .reminderNotiAt((request.placementTime() != null)? request.reminderNoti() : null)
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
                .completedAt(task.getCompletedAt())
                .placementDate(task.getPlacementDate())
                .placementTime(task.getPlacementTime())
                .dueDateTime(task.getDueDateTime())
                //.repeat(RepeatResponse.fromEntity(task.getRepeat()))
                .sortNumber(task.getSortNumber())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .reminderNoti(task.getReminderNotiAt())
                .build();
    }

    public SidebarTaskResponse toSidebarResponse(Task task) {
        return SidebarTaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .completed(task.getCompleted())
                .completedAt(task.getCompletedAt())
                .dueDateTime(task.getDueDateTime())
                .sortNumber(task.getSortNumber())
                .build();

    }

}
