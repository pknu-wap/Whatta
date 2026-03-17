package whatta.Whatta.notification.service;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import whatta.Whatta.event.entity.Event;
import whatta.Whatta.event.repository.EventRepository;
import whatta.Whatta.event.entity.Repeat;
import whatta.Whatta.notification.entity.ReminderNotification;
import whatta.Whatta.notification.enums.NotiStatus;
import whatta.Whatta.notification.enums.NotificationTargetType;
import whatta.Whatta.notification.repository.ReminderNotiRepository;
import whatta.Whatta.task.entity.Task;
import whatta.Whatta.user.payload.dto.ReminderNoti;

import java.time.LocalDateTime;
import java.util.List;

import static whatta.Whatta.global.util.RepeatUtil.findNextOccurrenceStartAfter;

@Slf4j
@Service
@AllArgsConstructor
public class ReminderNotiService {

    private final ReminderNotiRepository reminderNotiRepository;
    private final EventRepository eventRepository;

    private static final int COMPLETED_RETENTION_DAYS = 7;
    private static final int PROCESSING_TIMEOUT_MINUTES = 30;

    public void updateReminderNotification(Event event) {
        if (event.getStartTime() == null || event.getReminderNotiAt() == null) {
            cancelReminderNotification(event.getId());
            return;
        }

        upsertActiveReminderNotification(event);
    }

    public void updateReminderNotification(Task task) {
        if (task.getPlacementTime() == null || task.getReminderNotiAt() == null) {
            cancelReminderNotification(task.getId());
            return;
        }

        LocalDateTime triggerAt = calculateTriggerAt(
                LocalDateTime.of(task.getPlacementDate(), task.getPlacementTime()),
                null,
                task.getReminderNotiAt());

        if (triggerAt == null) {
            cancelReminderNotification(task.getId());
            return;
        }
        //해당 이벤트의 아직 안보낸 ACTIVE 알림이 있으면 update, 없으면 새로 생성
        ReminderNotification base = reminderNotiRepository.findByTargetTypeAndTargetIdAndStatusAndTriggerAtAfter(
                        NotificationTargetType.TASK, task.getId(), NotiStatus.ACTIVE, LocalDateTime.now())
                .orElseGet(() -> ReminderNotification.builder()
                        .userId(task.getUserId())
                        .status(NotiStatus.ACTIVE)
                        .targetType(NotificationTargetType.TASK)
                        .targetId(task.getId())
                        .build());

        reminderNotiRepository.save(base.toBuilder()
                .triggerAt(triggerAt)
                .build());
    }

    public void cancelReminderNotification(String targetId) {
        reminderNotiRepository.findByTargetIdAndStatus(targetId, NotiStatus.ACTIVE)
                .ifPresent(schedule -> {
                    ReminderNotification canceled = schedule.toBuilder()
                            .status(NotiStatus.CANCELED)
                            .build();
                    reminderNotiRepository.save(canceled);
                });
    }

    private LocalDateTime calculateTriggerAt(LocalDateTime startAt, Repeat repeat, ReminderNoti offset) {
        LocalDateTime now = LocalDateTime.now();

        if (repeat == null) {
            LocalDateTime triggerAt = applyOffset(startAt, offset);
            return triggerAt.isAfter(now) ? triggerAt : null; //이미 지난 이벤트면 알림 안 만듦
        }

        //반복 있고 미래의 triggerAt이 나올 때까지 찾기
        LocalDateTime cursor = now;
        int safeGuard = 0;
        while (safeGuard++ < 1000)
        {
            LocalDateTime occurrenceStart = findNextOccurrenceStartAfter(startAt, repeat, cursor);
            if(occurrenceStart == null) return null;

            LocalDateTime triggerAt = applyOffset(occurrenceStart, offset);
            if(triggerAt.isAfter(now)) return triggerAt;

            cursor = occurrenceStart.plusSeconds(1);
        }

        return null;
    }

    private LocalDateTime applyOffset(LocalDateTime startAt, ReminderNoti offset) {
        return startAt
                .minusDays(offset.day())
                .minusHours(offset.hour())
                .minusMinutes(offset.minute())
                .withSecond(0)
                .withNano(0);
    }

    public List<ReminderNotification> getActiveRemindersToSend(LocalDateTime now) {
        return reminderNotiRepository.findByStatusAndTriggerAtLessThanEqual(NotiStatus.ACTIVE, now);
    }

    public boolean tryMarkProcessing(String reminderId) {
        return transitionStatus(reminderId, NotiStatus.ACTIVE, NotiStatus.PROCESSING);
    }

    public void restoreActiveIfProcessing(String reminderId) {
        transitionStatus(reminderId, NotiStatus.PROCESSING, NotiStatus.ACTIVE);
    }

    public void cancelIfProcessing(String reminderId) {
        transitionStatus(reminderId, NotiStatus.PROCESSING, NotiStatus.CANCELED);
    }

    @Transactional
    public void completeAndScheduleNextReminder(ReminderNotification noti) {
        boolean completed = transitionStatus(noti.getId(), NotiStatus.PROCESSING, NotiStatus.COMPLETED);
        if (!completed) {
            log.warn("[REMINDER_COMPLETE_SKIPPED] id={}, reason=status transition failed", noti.getId());
            return;
        }

        if (noti.getTargetType() == NotificationTargetType.EVENT) {
            eventRepository.findById(noti.getTargetId())
                    .ifPresent(this::upsertActiveReminderNotification);
        }
    }

    private void upsertActiveReminderNotification(Event event){
        LocalDateTime triggerAt = calculateTriggerAt(LocalDateTime.of(event.getStartDate(), event.getStartTime()), event.getRepeat(), event.getReminderNotiAt());

        if(triggerAt == null) {
            cancelReminderNotification(event.getId());
            return;
        }

        ReminderNotification base = reminderNotiRepository.findByTargetTypeAndTargetIdAndStatusAndTriggerAtAfter(
                        NotificationTargetType.EVENT, event.getId(), NotiStatus.ACTIVE, LocalDateTime.now())
                .orElseGet(() -> ReminderNotification.builder()
                        .userId(event.getUserId())
                        .status(NotiStatus.ACTIVE)
                        .targetType(NotificationTargetType.EVENT)
                        .targetId(event.getId())
                        .build());

        reminderNotiRepository.save(base.toBuilder()
                .triggerAt(triggerAt)
                .build());
    }

    public long deleteExpiredCompletedReminders() {
        LocalDateTime expiredBefore = LocalDateTime.now().minusDays(COMPLETED_RETENTION_DAYS);
        return reminderNotiRepository.deleteByStatusAndUpdatedAtBefore(NotiStatus.COMPLETED, expiredBefore)
                + reminderNotiRepository.deleteByStatusAndUpdatedAtBefore(NotiStatus.CANCELED, expiredBefore);
    }

    public long cancelStaleProcessingReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime staleBefore = now.minusMinutes(PROCESSING_TIMEOUT_MINUTES);
        return reminderNotiRepository.updateStatusByStatusAndUpdatedAtBefore(
                NotiStatus.PROCESSING,
                staleBefore,
                NotiStatus.CANCELED,
                now
        );
    }

    public void cancelInvalidReminder(ReminderNotification noti, String reason) {
        boolean canceled = transitionStatus(noti.getId(), NotiStatus.PROCESSING, NotiStatus.CANCELED);
        if (!canceled) {
            log.warn("[REMINDER_INVALID_CANCEL_SKIPPED] id={}, reason=status transition failed", noti.getId());
        }
        log.warn("[REMINDER_NOTI_INVALID] id={}, reason={}", noti.getId(), reason);
    }

    private boolean transitionStatus(String reminderId, NotiStatus currentStatus, NotiStatus nextStatus) {
        return reminderNotiRepository.findByIdAndStatus(reminderId, currentStatus)
                .map(schedule -> {
                    ReminderNotification canceled = schedule.toBuilder()
                            .status(nextStatus)
                            .build();
                    reminderNotiRepository.save(canceled);
                    return true;
                }).orElse(false);
    }
}
