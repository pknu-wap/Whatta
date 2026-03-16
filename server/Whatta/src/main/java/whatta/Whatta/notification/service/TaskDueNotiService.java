package whatta.Whatta.notification.service;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import whatta.Whatta.notification.entity.TaskDueNotification;
import whatta.Whatta.notification.enums.DueNotificationType;
import whatta.Whatta.notification.enums.NotiStatus;
import whatta.Whatta.notification.repository.TaskDueNotiRepository;
import whatta.Whatta.task.entity.Task;
import whatta.Whatta.task.repository.TaskRepository;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@AllArgsConstructor
public class TaskDueNotiService {

    private final TaskDueNotiRepository taskDueNotiRepository;
    private final TaskRepository taskRepository;

    private static final int COMPLETED_RETENTION_DAYS = 7;

    public void updateDueNotification(Task task) {
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

    public void cancelDueNotification(String targetId) {
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

    public List<TaskDueNotification> getActiveDueNotisToSend(LocalDateTime now) {
        return taskDueNotiRepository.findByStatusAndTriggerAtLessThanEqual(NotiStatus.ACTIVE, now);
    }

    public void completeAndScheduleNextDueNoti(TaskDueNotification noti) {
        TaskDueNotification updated = noti.toBuilder()
                .status(NotiStatus.COMPLETED)
                .build();

        taskDueNotiRepository.save(updated);

        if (noti.getDueNotiType() == DueNotificationType.DUE_ONE_DAY_BEFORE) {
            taskRepository.findById(noti.getTargetId())
                    .ifPresent(this::updateDueNotification);
        }
    }

    public long deleteExpiredCompletedDueNotis() {
        LocalDateTime expiredBefore = LocalDateTime.now().minusDays(COMPLETED_RETENTION_DAYS);
        return taskDueNotiRepository.deleteByStatusAndUpdatedAtBefore(NotiStatus.COMPLETED, expiredBefore)
                + taskDueNotiRepository.deleteByStatusAndUpdatedAtBefore(NotiStatus.CANCELED, expiredBefore);
    }

    public void cancelInvalidDueNoti(TaskDueNotification noti, String reason) {
        TaskDueNotification canceled = noti.toBuilder()
                .status(NotiStatus.CANCELED)
                .build();
        taskDueNotiRepository.save(canceled);
        log.warn("[TASK_DUE_NOTI_INVALID] id={}, reason={}", noti.getId(), reason);
    }

}
