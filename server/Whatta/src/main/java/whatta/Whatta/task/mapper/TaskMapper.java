package whatta.Whatta.task.mapper;

import org.springframework.stereotype.Component;
import whatta.Whatta.global.label.payload.LabelsResponse;
import whatta.Whatta.global.repeat.payload.RepeatResponse;
import whatta.Whatta.global.util.LabelUtils;
import whatta.Whatta.task.entity.Task;
import whatta.Whatta.task.payload.request.TaskCreateRequest;
import whatta.Whatta.task.payload.response.SidebarTaskResponse;
import whatta.Whatta.task.payload.response.TaskResponse;
import whatta.Whatta.user.entity.UserSetting;

@Component
public class TaskMapper {
    public Task toEntity(TaskCreateRequest request, UserSetting userSetting){
        //title이 null이나 blank면 기본값을 줌
        String title = (request.getTitle() == null || request.getTitle().isBlank())
                ? "새로운 작업"
                : request.getTitle();

        return Task.builder()
                .userId(userSetting.getUserId())
                .title(title)
                .content(request.getContent())
                .labels(LabelUtils.getTitleAndColorKeyByIds(userSetting, request.getLabels()))
                .completed(false)
                .placementDate(request.getPlacementDate())
                .placementTime(request.getPlacementTime())
                .dueDateTime(request.getDueDateTime())
                .repeat((request.getRepeat() == null)? null : request.getRepeat().toEntity()) //null 검사는 호출하는 쪽에서
                .colorKey(request.getColorKey())
                .build();
    }

    public TaskResponse toResponse(Task task) {
        return TaskResponse.builder()
                .id(task.getId())
                .userId(task.getUserId())
                .title(task.getTitle())
                .content(task.getContent())
                .labels(LabelsResponse.fromEntity(task.getLabels()))
                .completed(task.getCompleted())
                .placementDate(task.getPlacementDate())
                .placementTime(task.getPlacementTime())
                .dueDateTime(task.getDueDateTime())
                .repeat(RepeatResponse.fromEntity(task.getRepeat()))
                .sortNumber(task.getSortNumber())
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
                .sortNumber(task.getSortNumber())
                .build();

    }

}
