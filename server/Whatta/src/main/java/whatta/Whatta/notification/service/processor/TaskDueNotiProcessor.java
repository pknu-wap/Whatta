package whatta.Whatta.notification.service.processor;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.notification.entity.TaskDueNotification;
import whatta.Whatta.notification.enums.DueNotificationType;
import whatta.Whatta.notification.enums.NotificationSendResult;
import whatta.Whatta.notification.service.NotificationSendService;
import whatta.Whatta.notification.service.TaskDueNotiService;
import whatta.Whatta.task.entity.Task;
import whatta.Whatta.task.repository.TaskRepository;

@Service
@AllArgsConstructor
public class TaskDueNotiProcessor {

    private final NotificationSendService notificationSendService;
    private final TaskDueNotiService taskDueNotiService;
    private final TaskRepository taskRepository;

    public NotificationSendResult processDueNoti(TaskDueNotification noti) {
        String targetId = noti.getTargetId();
        Task task = taskRepository.findById(targetId).orElse(null);
        if (task == null) {
            taskDueNotiService.cancelInvalidDueNoti(noti, "task not found: " + targetId);
            return NotificationSendResult.TERMINAL_FAILURE;
        }

        DueNotificationType dueNotiType = noti.getDueNotiType();
        if (dueNotiType == null) {
            taskDueNotiService.cancelInvalidDueNoti(noti, "dueNotiType is null: " + noti.getId());
            return NotificationSendResult.TERMINAL_FAILURE;
        }

        String title = task.getTitle();
        String body = switch (dueNotiType) {
            case DUE_ONE_DAY_BEFORE -> String.format(
                    "내일 '%s' 마감인 거 잊지 않으셨죠?",
                    task.getTitle()
            );
            case DUE_ONE_HOUR_BEFORE -> String.format(
                    "한 시간 뒤 '%s' 마감이에요. 서두르세요!",
                    task.getTitle()
            );
        };

        return notificationSendService.sendTaskDue(noti.getUserId(), title, body, task.getId());
    }
}
