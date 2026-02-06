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

    //-------------reminder---------------
    //1. event 생성/수정 시
    public void createReminderNotification(Event event) {
        if(event.getReminderNotiAt() == null) { //알림 off: 기존 스케줄 있으면 취소
            cancelReminderNotification(event.getId());
            return;
        }

        //알림 시각 계산
        LocalDateTime triggerAt = calculateTriggerAt(LocalDateTime.of(event.getStartDate(), event.getStartTime()), event.getRepeat(), event.getReminderNotiAt());

        if(triggerAt == null) {
            return;
        }
        //해당 이벤트의 아직 안보낸 ACTIVE 알림이 있으면 update, 없으면 새로 생성
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

    //2. task 생성/수정 시
    public void createReminderNotification(Task task) {
        if(task.getReminderNotiAt() == null) { //알림 off: 기존 스케줄 있으면 취소
            cancelReminderNotification(task.getId());
            return;
        }

        //알림 시각 계산
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
                .minusMinutes(offset.minute());
    }

    //지금 시각 기준으로 울려야 하는 리마인드 알림들 조회
    public List<ReminderNotification> getActiveRemindersToSend(LocalDateTime now) {
        return reminderNotiRepository.findByStatusAndTriggerAtLessThanEqual(NotiStatus.ACTIVE, now);
    }

    //알림 보낸 후 상태 업데이트
    @Transactional
    public void completeReminder(ReminderNotification noti) {
        //완료 표시
        ReminderNotification updated = noti.toBuilder()
                .status(NotiStatus.COMPLETED)
                .build();

        reminderNotiRepository.save(updated);

        //반복일정의 경우 다음 알림에 저장
        Event target = eventRepository.findById(noti.getTargetId())
                .orElseThrow(() -> new RestApiException(ErrorCode.EVENT_NOT_FOUND));

        LocalDateTime nextTriggerAt = calculateTriggerAt(LocalDateTime.of(target.getStartDate(), target.getStartTime()), target.getRepeat(), target.getReminderNotiAt());
        System.out.println("repeat event nextTriggerAt: " + nextTriggerAt);

        if (nextTriggerAt == null) {
            return;
        }
        //해당 이벤트의 아직 안보낸 ACTIVE 알림이 있으면 update, 없으면 새로 생성
        ReminderNotification base = reminderNotiRepository.findByTargetTypeAndTargetIdAndStatusAndTriggerAtAfter(
                        NotificationTargetType.EVENT, target.getId(), NotiStatus.ACTIVE, LocalDateTime.now())
                .orElseGet(() -> ReminderNotification.builder()
                        .userId(target.getUserId())
                        .status(NotiStatus.ACTIVE)
                        .targetType(NotificationTargetType.EVENT)
                        .targetId(target.getId())
                        .triggerAt(nextTriggerAt)
                        .build());

        System.out.println("repeat event reminder" + base);
        reminderNotiRepository.save(base);
    }
}
