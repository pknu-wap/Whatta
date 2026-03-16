package whatta.Whatta.notification.service;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import whatta.Whatta.notification.entity.ReminderNotification;
import whatta.Whatta.notification.entity.TaskDueNotification;
import whatta.Whatta.notification.enums.DueNotificationType;
import whatta.Whatta.notification.enums.NotiStatus;
import whatta.Whatta.notification.enums.NotificationTargetType;
import whatta.Whatta.notification.repository.TaskDueNotiRepository;
import whatta.Whatta.task.entity.Task;

import java.time.LocalDateTime;

@Slf4j
@Service
@AllArgsConstructor
public class TaskDueNotiService {

    private final TaskDueNotiRepository taskDueNotiRepository;

    public void updateReminderNotification(Task task) {
        if(task.getDueDateTime() == null || task.getCompleted()) {
            cancelDueNotification(task.getId());
            return;
        }

        DueNotificationType dueNotiType = resolveDueNotiType(task.getDueDateTime());
        if(dueNotiType == null) {
            cancelDueNotification(task.getId());
            return;
        }

        LocalDateTime triggerAt = calculateTriggerAt(task.getDueDateTime(), dueNotiType);

        //해당 task의 아직 안보낸 ACTIVE 알림이 있으면 update, 없으면 새로 생성
        TaskDueNotification base = taskDueNotiRepository.findByTargetIdAndStatusAndTriggerAtAfter(
                task.getId(), NotiStatus.ACTIVE, LocalDateTime.now())
                .orElseGet(() -> TaskDueNotification.builder()
                        .userId(task.getUserId())
                        .status(NotiStatus.ACTIVE)
                        .targetId(task.getId())
                        .build());

        taskDueNotiRepository.save(base.toBuilder()
                .dueNotiType(dueNotiType)
                .triggerAt(triggerAt)
                .build());
    }

    private void cancelDueNotification(String targetId) {
        taskDueNotiRepository.findByTargetIdAndStatus(targetId, NotiStatus.ACTIVE)
                .ifPresent(schedule -> {
                    TaskDueNotification canceled = schedule.toBuilder()
                            .status(NotiStatus.CANCELED)
                            .build();
                    taskDueNotiRepository.save(canceled);
                });
    }

    private DueNotificationType resolveDueNotiType(LocalDateTime dueDateTime) {
        LocalDateTime now = LocalDateTime.now();

        LocalDateTime oneDayBefore = dueDateTime.minusDays(1);
        LocalDateTime oneHourBefore = dueDateTime.minusHours(1);

        if (now.isBefore(oneDayBefore)) {
            return DueNotificationType.DUE_ONE_DAY_BEFORE;
        }

        if (now.isBefore(oneHourBefore)) {
            return DueNotificationType.DUE_ONE_HOUR_BEFORE;
        }

        return null;
    }

    private LocalDateTime calculateTriggerAt(LocalDateTime dueDateTime, DueNotificationType dueNotiType) {
        return switch (dueNotiType) {
            case DUE_ONE_DAY_BEFORE -> dueDateTime.minusDays(1);
            case DUE_ONE_HOUR_BEFORE -> dueDateTime.minusHours(1);
        };
    }

}
