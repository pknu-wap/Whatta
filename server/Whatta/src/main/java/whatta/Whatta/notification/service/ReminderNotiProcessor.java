package whatta.Whatta.notification.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.event.entity.Event;
import whatta.Whatta.event.repository.EventRepository;
import whatta.Whatta.notification.entity.ReminderNotification;
import whatta.Whatta.notification.enums.NotificationTargetType;
import whatta.Whatta.task.entity.Task;
import whatta.Whatta.task.repository.TaskRepository;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
@AllArgsConstructor
public class ReminderNotiProcessor {

    private final NotificationSendService notificationSendService;
    private final ReminderNotiService reminderNotiService;
    private final EventRepository eventRepository;
    private final TaskRepository taskRepository;

    public void processReminder(ReminderNotification noti) {
        String userId = noti.getUserId();
        String targetId = noti.getTargetId();

        String notiTitle = "";
        String targetType = "";
        String targetTitle = "";
        LocalDateTime targetStartAt = null;
        if (noti.getTargetType() == NotificationTargetType.EVENT) {
            Event event = eventRepository.findById(targetId).orElse(null);
            if (event == null) {
                reminderNotiService.cancelInvalidReminder(noti, "event not found: " + targetId);
                return;
            }

            notiTitle = "일정 리마인드";
            targetType = "일정";
            targetTitle = event.getTitle();
            targetStartAt = LocalDateTime.of(event.getStartDate(), event.getStartTime());
        } else if (noti.getTargetType() == NotificationTargetType.TASK) {
            Task task = taskRepository.findById(targetId).orElse(null);
            if (task == null) {
                reminderNotiService.cancelInvalidReminder(noti, "task not found: " + targetId);
                return;
            }

            notiTitle = "할 일 리마인드";
            targetType = "할 일";
            targetTitle = task.getTitle();
            targetStartAt = LocalDateTime.of(task.getPlacementDate(), task.getPlacementTime());
        } else {
            reminderNotiService.cancelInvalidReminder(noti, "unsupported targetType: " + noti.getTargetType());
        }
        LocalDateTime triggerAt = noti.getTriggerAt();

        long minutesUntilStart = Duration.between(triggerAt, targetStartAt).toMinutes();
        String offsetText = formatOffsetText(minutesUntilStart);
        String body = String.format(
                "%s '%s' %s이 있어요.", offsetText, targetTitle, targetType
        );

        notificationSendService.sendReminder(userId, notiTitle, body, targetId);
    }

    private String formatOffsetText(long minutesUntilStart) {
        long minutesPerDay = 60L * 24L;
        long days = minutesUntilStart / minutesPerDay;
        long remain = minutesUntilStart % minutesPerDay;

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
        }else {
            sb.append("뒤");
        }

        return sb.toString();
    }
}
