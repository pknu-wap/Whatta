package whatta.Whatta.notification.scheduler;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.RecoverableDataAccessException;
import org.springframework.dao.TransientDataAccessException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import whatta.Whatta.notification.entity.ReminderNotification;
import whatta.Whatta.notification.enums.NotificationSendResult;
import whatta.Whatta.notification.service.processor.ReminderNotiProcessor;
import whatta.Whatta.notification.service.ReminderNotiService;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@AllArgsConstructor
public class ReminderNotiScheduler {

    private final ReminderNotiService reminderNotiService;
    private final ReminderNotiProcessor reminderNotiProcessor;

    @Scheduled(cron = "0 * * * * *") //1분마다
    public void sendReminder() {
        LocalDateTime now = LocalDateTime.now();

        List<ReminderNotification> notificationsDueNow =
                reminderNotiService.getActiveRemindersToSend(now);

        if(notificationsDueNow.isEmpty()) return;

        for(ReminderNotification noti : notificationsDueNow) {
            if (!reminderNotiService.tryMarkProcessing(noti.getId())) {
                continue;
            }

            try {
                NotificationSendResult sendResult = reminderNotiProcessor.processReminder(noti);
                switch (sendResult) {
                    case SUCCESS -> reminderNotiService.completeAndScheduleNextReminder(noti);
                    case RETRYABLE_FAILURE -> reminderNotiService.restoreActiveIfProcessing(noti.getId());
                    case TERMINAL_FAILURE -> reminderNotiService.cancelIfProcessing(noti.getId());
                }
            } catch (TransientDataAccessException | RecoverableDataAccessException e) {
                reminderNotiService.restoreActiveIfProcessing(noti.getId());
                log.error("[REMINDER] Retryable infra/db failure. notiId={}", noti.getId(), e);
            } catch (Exception e) {
                reminderNotiService.cancelIfProcessing(noti.getId());
                log.error("[REMINDER] Non-retryable processing failure. notiId={}", noti.getId(), e);
            }
        }
    }

    @Scheduled(cron = "0 0 4 * * *", zone = "Asia/Seoul")
    public void cleanupCompletedReminders () {
        try {
            long deletedCount = reminderNotiService.deleteExpiredCompletedReminders();
            log.info("[REMINDER] [CLEANUP] deletedCount={}", deletedCount);
        } catch (Exception e) {
            log.error("[REMINDER] [CLEANUP] Failed to cleanup completed reminders", e);
        }
    }

    @Scheduled(cron = "0 */10 * * * *", zone = "Asia/Seoul")
    public void cleanupStaleProcessingReminders() {
        try {
            long canceledProcessingCount = reminderNotiService.cancelStaleProcessingReminders();
            log.info("[REMINDER] [PROCESSING_CLEANUP] canceledProcessingCount={}", canceledProcessingCount);
        } catch (Exception e) {
            log.error("[REMINDER] [PROCESSING_CLEANUP] Failed to cleanup stale processing reminders", e);
        }
    }
}
