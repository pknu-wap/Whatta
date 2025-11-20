package whatta.Whatta.notification.scheduler;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import whatta.Whatta.event.entity.Event;
import whatta.Whatta.event.repository.EventRepository;
import whatta.Whatta.notification.entity.ScheduledNotification;
import whatta.Whatta.notification.enums.NotificationTargetType;
import whatta.Whatta.notification.service.NotificationSendService;
import whatta.Whatta.notification.service.ScheduledNotificationService;
import whatta.Whatta.task.entity.Task;
import whatta.Whatta.task.repository.TaskRepository;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@AllArgsConstructor
public class ReminderNotiScheduler {

    private final ScheduledNotificationService scheduledNotiService;
    private final NotificationSendService notificationSendService;
    private final EventRepository eventRepository;
    private final TaskRepository taskRepository;

    @Scheduled(fixedRate = 60 * 1000) //1분마다
    public void sendReminder() {
        LocalDateTime now = LocalDateTime.now();
        //log.info("localDateTime: {}", now);

        List<ScheduledNotification> dueNotis =
                scheduledNotiService.findDueReminders(now);

        if(dueNotis.isEmpty()) return;

        for(ScheduledNotification noti : dueNotis) {
            try {
                handleReminder(noti);
                scheduledNotiService.afterReminderSent(noti);
            } catch (Exception e) {
                log.error("[REMINDER] Failed to send reminder. notiId={}", noti.getId(), e);
            }
        }
    }

    private void handleReminder(ScheduledNotification noti) {
        String userId = noti.getUserId();
        String targetId = noti.getTargetId();

        String notiTitle = "";
        String title = "";
        LocalDateTime startAt = null;
        String targetType = "";
        if (noti.getTargetType() == NotificationTargetType.EVENT) {
            Event event = eventRepository.findById(targetId).orElse(null); //TODO: 나중에 수정

            notiTitle = "일정 리마인드";
            title = event.getTitle();
            startAt = LocalDateTime.of(event.getStartDate(), event.getStartTime());
            targetType = "일정";
        } else if (noti.getTargetType() == NotificationTargetType.TASK) {
            Task task = taskRepository.findById(targetId).orElse(null);
            notiTitle = "할 일 리마인드";
            title = task.getTitle();
            startAt = LocalDateTime.of(task.getPlacementDate(), task.getPlacementTime());
            targetType = "할 일";
        }
        LocalDateTime triggerAt = noti.getTriggerAt();

        long totalMinutes = Duration.between(triggerAt, startAt).toMinutes();
        String offsetText = buildOffsetText(totalMinutes);
        String body = String.format(
                "%s뒤 '%s' %s이 있어요.", offsetText, title, targetType
        );

        notificationSendService.sendReminder(userId, notiTitle, body, targetId);
    }

    private String buildOffsetText(long totalMinutes) {
        long minutesPerDay = 60L * 24L;
        long days = totalMinutes / minutesPerDay;
        long remain = totalMinutes % minutesPerDay;

        long hours = remain / 60L;
        long minutes = remain % 60L;

        StringBuilder sb = new StringBuilder();

        if (days > 0) {
            sb.append(days).append("일 ");
        }
        if (hours > 0) {
            sb.append(hours).append("시간 ");
        }

        if (minutes > 0) {
            sb.append(minutes).append("분 ");
        }

        if (sb.isEmpty()) {
            sb.append("곧 ");
        }

        return sb.toString().trim();
    }
}
