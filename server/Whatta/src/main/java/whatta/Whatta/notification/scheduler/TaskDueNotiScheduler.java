package whatta.Whatta.notification.scheduler;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import whatta.Whatta.notification.entity.TaskDueNotification;
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
            try {
                boolean sent = taskDueNotiProcessor.processDueNoti(noti);
                if (sent) {
                    taskDueNotiService.completeAndScheduleNextDueNoti(noti);
                }
            } catch (Exception e) {
                log.error("[DUENOTIFICATION] Failed to send task DueNoti. notiId={}", noti.getId(), e);
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
}
