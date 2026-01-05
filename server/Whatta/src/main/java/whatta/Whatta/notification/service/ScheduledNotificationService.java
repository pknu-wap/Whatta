package whatta.Whatta.notification.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import whatta.Whatta.event.entity.Event;
import whatta.Whatta.event.repository.EventRepository;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.global.repeat.Repeat;
import whatta.Whatta.notification.entity.ScheduledNotification;
import whatta.Whatta.notification.enums.NotiStatus;
import whatta.Whatta.notification.enums.NotificationTargetType;
import whatta.Whatta.notification.repository.ScheduledNotificationRepository;
import whatta.Whatta.task.entity.Task;
import whatta.Whatta.user.payload.dto.ReminderNoti;

import java.time.LocalDateTime;
import java.util.List;

import static whatta.Whatta.global.util.RepeatUtil.findNextOccurrenceStartAfter;

@Service
@AllArgsConstructor
public class ScheduledNotificationService {

    private final ScheduledNotificationRepository scheduledNotiRepository;
    private final EventRepository eventRepository;

    //-------------reminder---------------
    //1. event 생성/수정 시
    public void createScheduledNotification(Event event) {
        if(event.getReminderNotiAt() == null) { //알림 off: 기존 스케줄 있으면 취소
            cancelScheduledNotification(event.getId());
            return;
        }

        //알림 시각 계산
        LocalDateTime triggerAt = calculateTriggerAt(LocalDateTime.of(event.getStartDate(), event.getStartTime()), event.getRepeat(), event.getReminderNotiAt());

        if(triggerAt == null) { return; }
        //해당 이벤트의 아직 안보낸 ACTIVE 알림이 있으면 update, 없으면 새로 생성
        ScheduledNotification base = scheduledNotiRepository.findByTargetTypeAndTargetIdAndStatusAndTriggerAtAfter(
                NotificationTargetType.EVENT, event.getId(), NotiStatus.ACTIVE, LocalDateTime.now())
                .orElseGet(() -> ScheduledNotification.builder()
                        .userId(event.getUserId())
                        .status(NotiStatus.ACTIVE)
                        .targetType(NotificationTargetType.EVENT)
                        .targetId(event.getId())
                        .build());

        scheduledNotiRepository.save(base.toBuilder()
                .triggerAt(triggerAt)
                .updatedAt(LocalDateTime.now())
                .build());
    }

    //2. task 생성/수정 시
    public void createScheduledNotification(Task task) {
        if(task.getReminderNotiAt() == null) { //알림 off: 기존 스케줄 있으면 취소
            cancelScheduledNotification(task.getId());
            return;
        }

        //알림 시각 계산
        LocalDateTime triggerAt = calculateTriggerAt(LocalDateTime.of(task.getPlacementDate(), task.getPlacementTime()), null, task.getReminderNotiAt());

        if(triggerAt == null) { return; }
        //해당 이벤트의 아직 안보낸 ACTIVE 알림이 있으면 update, 없으면 새로 생성
        ScheduledNotification base = scheduledNotiRepository.findByTargetTypeAndTargetIdAndStatusAndTriggerAtAfter(
                        NotificationTargetType.TASK, task.getId(), NotiStatus.ACTIVE, LocalDateTime.now())
                .orElseGet(() -> ScheduledNotification.builder()
                        .userId(task.getUserId())
                        .status(NotiStatus.ACTIVE)
                        .targetType(NotificationTargetType.TASK)
                        .targetId(task.getId())
                        .build());

        scheduledNotiRepository.save(base.toBuilder()
                .triggerAt(triggerAt)
                .updatedAt(LocalDateTime.now())
                .build());
    }

    public void cancelScheduledNotification(String targetId) {
        scheduledNotiRepository.findByTargetIdAndStatus(targetId, NotiStatus.ACTIVE)
                .ifPresent(schedule -> {
                    ScheduledNotification canceled = schedule.toBuilder()
                            .status(NotiStatus.CANCELED)
                            .build();
                    scheduledNotiRepository.save(canceled);
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
                .minusMinutes(offset.minute());
    }

    //지금 시각 기준으로 울려야 하는 리마인드 알림들 조회
    public List<ScheduledNotification> findDueReminders(LocalDateTime now) {
        return scheduledNotiRepository.findByStatusAndTriggerAtLessThanEqual(NotiStatus.ACTIVE, now);
    }

    //알림 보낸 후 상태 업데이트
    @Transactional
    public void afterReminderSent(ScheduledNotification noti) {
        //완료 표시
        ScheduledNotification updated = noti.toBuilder()
                .status(NotiStatus.COMPLETED)
                .build();

        scheduledNotiRepository.save(updated);

        //반복일정의 경우 다음 알림에 저장
        Event target = eventRepository.findById(noti.getTargetId())
                .orElseThrow(() -> new RestApiException(ErrorCode.EVENT_NOT_FOUND));

        LocalDateTime nextTriggerAt = calculateTriggerAt(LocalDateTime.of(target.getStartDate(), target.getStartTime()), target.getRepeat(), target.getReminderNotiAt());

        if (nextTriggerAt == null) {
            return;
        }
        //해당 이벤트의 아직 안보낸 ACTIVE 알림이 있으면 update, 없으면 새로 생성
        ScheduledNotification base = scheduledNotiRepository.findByTargetTypeAndTargetIdAndStatusAndTriggerAtAfter(
                        NotificationTargetType.EVENT, target.getId(), NotiStatus.ACTIVE, LocalDateTime.now())
                .orElseGet(() -> ScheduledNotification.builder()
                        .userId(target.getUserId())
                        .status(NotiStatus.ACTIVE)
                        .targetType(NotificationTargetType.EVENT)
                        .targetId(target.getId())
                        .triggerAt(nextTriggerAt)
                        .build());

        scheduledNotiRepository.save(base);
    }
}
