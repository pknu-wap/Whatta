package whatta.Whatta.notification.scheduler;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import whatta.Whatta.notification.entity.ReminderNotification;
import whatta.Whatta.notification.service.ReminderNotiProcessor;
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
        //log.info("localDateTime: {}", now);

        List<ReminderNotification> notificationsDueNow =
                reminderNotiService.getActiveRemindersToSend(now);

        if(notificationsDueNow.isEmpty()) return;

        for(ReminderNotification noti : notificationsDueNow) {
            try {
                reminderNotiProcessor.processReminder(noti);
                reminderNotiService.completeAndScheduleNextReminder(noti);
            } catch (Exception e) {
                log.error("[REMINDER] Failed to send reminder. notiId={}", noti.getId(), e);
            }
        }
    }
}
