package whatta.Whatta.notification.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import whatta.Whatta.event.entity.Event;
import whatta.Whatta.event.repository.EventRepository;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.global.repeat.Repeat;
import whatta.Whatta.notification.entity.ReminderNotification;
import whatta.Whatta.notification.enums.NotiStatus;
import whatta.Whatta.notification.enums.NotificationTargetType;
import whatta.Whatta.notification.repository.ReminderNotiRepository;
import whatta.Whatta.task.entity.Task;
import whatta.Whatta.user.payload.dto.ReminderNoti;

import java.time.LocalDateTime;
import java.util.List;

import static whatta.Whatta.global.util.RepeatUtil.findNextOccurrenceStartAfter;

@Service
@AllArgsConstructor
public class ReminderNotiService {

    private final ReminderNotiRepository reminderNotiRepository;
    private final EventRepository eventRepository;

    //event 생성/수정 시
    public void updateReminderNotification(Event event) {
        if(event.getReminderNotiAt() == null) { //기존 스케줄 있으면 취소
            cancelReminderNotification(event.getId());
            return;
        }

        upsertActiveReminderNotification(event);
    }

    //task 생성/수정 시
    public void updateReminderNotification(Task task) {
        if(task.getReminderNotiAt() == null) { //알림 off: 기존 스케줄 있으면 취소
            cancelReminderNotification(task.getId());
            return;
        }

        LocalDateTime triggerAt = calculateTriggerAt(LocalDateTime.of(task.getPlacementDate(), task.getPlacementTime()), null, task.getReminderNotiAt());

        if(triggerAt == null) { return; }
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
                .updatedAt(LocalDateTime.now())
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

        if(repeat == null) {
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

    @Transactional
    public void completeAndScheduleNextReminder(ReminderNotification noti) {
        ReminderNotification updated = noti.toBuilder()
                .status(NotiStatus.COMPLETED)
                .build();

        reminderNotiRepository.save(updated);

        if (noti.getTargetType() == NotificationTargetType.EVENT) {
            Event target = eventRepository.findById(noti.getTargetId())
                    .orElseThrow(() -> new RestApiException(ErrorCode.EVENT_NOT_FOUND));

            upsertActiveReminderNotification(target);
        }
    }

    private void upsertActiveReminderNotification(Event event){
        LocalDateTime triggerAt = calculateTriggerAt(LocalDateTime.of(event.getStartDate(), event.getStartTime()), event.getRepeat(), event.getReminderNotiAt());

        if(triggerAt == null) {
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
                .updatedAt(LocalDateTime.now())
                .build());
    }
}
