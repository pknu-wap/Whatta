package whatta.Whatta.notification.scheduler;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.RecoverableDataAccessException;
import org.springframework.dao.TransientDataAccessException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import whatta.Whatta.notification.entity.TaskDueNotification;
import whatta.Whatta.notification.enums.NotificationSendResult;
import whatta.Whatta.notification.service.TaskDueNotiService;
import whatta.Whatta.notification.service.processor.TaskDueNotiProcessor;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@AllArgsConstructor
public class TaskDueNotiScheduler {
    private final TaskDueNotiService taskDueNotiService;
    private final TaskDueNotiProcessor taskDueNotiProcessor;

    @Scheduled(cron = "0 * * * * *") //1분마다
    public void sendDueNotis() {
        LocalDateTime now = LocalDateTime.now();

        List<TaskDueNotification> notificationsDueNow =
                taskDueNotiService.getActiveDueNotisToSend(now);

        if(notificationsDueNow.isEmpty()) return;

        for(TaskDueNotification noti : notificationsDueNow) {
            if (!taskDueNotiService.tryMarkProcessing(noti.getId())) {
                continue;
            }

            try {
                NotificationSendResult sendResult = taskDueNotiProcessor.processDueNoti(noti);
                switch (sendResult) {
                    case SUCCESS -> taskDueNotiService.completeAndScheduleNextDueNoti(noti);
                    case RETRYABLE_FAILURE -> taskDueNotiService.restoreActiveIfProcessing(noti.getId());
                    case TERMINAL_FAILURE -> taskDueNotiService.cancelIfProcessing(noti.getId());
                }
            } catch (TransientDataAccessException | RecoverableDataAccessException e) {
                taskDueNotiService.restoreActiveIfProcessing(noti.getId());
                log.error("[DUENOTIFICATION] Retryable infra/db failure. notiId={}", noti.getId(), e);
            } catch (Exception e) {
                taskDueNotiService.cancelIfProcessing(noti.getId());
                log.error("[DUENOTIFICATION] Non-retryable processing failure. notiId={}", noti.getId(), e);
            }
        }
    }

    @Scheduled(cron = "0 0 4 * * *", zone = "Asia/Seoul")
    public void cleanupCompletedDueNotis () {
        try {
            long deletedCount = taskDueNotiService.deleteExpiredCompletedDueNotis();
            log.info("[DUENOTIFICATION] [CLEANUP] deletedCount={}", deletedCount);
        } catch (Exception e) {
            log.error("[DUENOTIFICATION] [CLEANUP] Failed to cleanup completed DueNotis", e);
        }
    }

    @Scheduled(cron = "0 */10 * * * *", zone = "Asia/Seoul")
    public void cleanupStaleProcessingDueNotis() {
        try {
            long canceledProcessingCount = taskDueNotiService.cancelStaleProcessingDueNotis();
            log.info("[DUENOTIFICATION] [PROCESSING_CLEANUP] canceledProcessingCount={}", canceledProcessingCount);
        } catch (Exception e) {
            log.error("[DUENOTIFICATION] [PROCESSING_CLEANUP] Failed to cleanup stale processing due notifications", e);
        }
    }
}
