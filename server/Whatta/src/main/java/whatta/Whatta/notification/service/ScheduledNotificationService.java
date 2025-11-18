package whatta.Whatta.notification.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.event.entity.Event;
import whatta.Whatta.global.repeat.Repeat;
import whatta.Whatta.global.repeat.RepeatUnit;
import whatta.Whatta.global.util.RepeatUtil;
import whatta.Whatta.notification.entity.ScheduledNotification;
import whatta.Whatta.notification.enums.NotiStatus;
import whatta.Whatta.notification.enums.NotificationTargetType;
import whatta.Whatta.notification.repository.ScheduledNotificationRepository;
import whatta.Whatta.task.entity.Task;
import whatta.Whatta.user.payload.dto.ReminderNoti;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Service
@AllArgsConstructor
public class ScheduledNotificationService {

    private final ScheduledNotificationRepository scheduledNotiRepository;

    //-------------reminder---------------
    //1. event 생성/수정 시
    public void createScheduledNotification(Event event) {
        if(event.getReminderNotiAt() == null) { //알림 off: 기존 스케줄 있으면 취소
            scheduledNotiRepository.findByTargetTypeAndTargetIdAndStatus(NotificationTargetType.EVENT, event.getId(), NotiStatus.ACTIVE)
                    .ifPresent(schedule -> {
                        ScheduledNotification canceled = schedule.toBuilder()
                                .status(NotiStatus.CANCELED)
                                .build();
                        scheduledNotiRepository.save(canceled);
                    });
            return;
        }

        //알림 시각 계산
        LocalDateTime triggerAt = calculateTriggerAt(LocalDateTime.of(event.getStartDate(), event.getStartTime()), event.getRepeat(), event.getReminderNotiAt());

        if(triggerAt == null) { return;}
        //해당 이벤트의 아직 안보낸 ACTIVE 알림이 있으면 update, 없으면 새로 생성
        ScheduledNotification base = scheduledNotiRepository.findByTargetTypeAndTargetIdAndStatusAndTriggerAtAfter(
                NotificationTargetType.EVENT, event.getId(), NotiStatus.ACTIVE, LocalDateTime.now())
                .orElseGet(() -> ScheduledNotification.builder()
                        .userId(event.getUserId())
                        .status(NotiStatus.ACTIVE)
                        .targetType(NotificationTargetType.EVENT)
                        .targetId(event.getId())
                        .triggerAt(triggerAt)
                        .build());

        scheduledNotiRepository.save(base);
    }

    //2. task 생성 수정 시
    public void createScheduledNotification(Task task) {
        if(task.getReminderNotiAt() == null) { //알림 off: 기존 스케줄 있으면 취소
            scheduledNotiRepository.findByTargetTypeAndTargetIdAndStatus(NotificationTargetType.TASK, task.getId(), NotiStatus.ACTIVE)
                    .ifPresent(schedule -> {
                        ScheduledNotification canceled = schedule.toBuilder()
                                .status(NotiStatus.CANCELED)
                                .build();
                        scheduledNotiRepository.save(canceled);
                    });
            return;
        }

        //알림 시각 계산
        LocalDateTime triggerAt = calculateTriggerAt(LocalDateTime.of(task.getPlacementDate(), task.getPlacementTime()), task.getRepeat(), task.getReminderNotiAt());

        if(triggerAt == null) { return;}
        //해당 이벤트의 아직 안보낸 ACTIVE 알림이 있으면 update, 없으면 새로 생성
        ScheduledNotification base = scheduledNotiRepository.findByTargetTypeAndTargetIdAndStatusAndTriggerAtAfter(
                        NotificationTargetType.TASK, task.getId(), NotiStatus.ACTIVE, LocalDateTime.now())
                .orElseGet(() -> ScheduledNotification.builder()
                        .userId(task.getUserId())
                        .status(NotiStatus.ACTIVE)
                        .targetType(NotificationTargetType.TASK)
                        .targetId(task.getId())
                        .triggerAt(triggerAt)
                        .build());

        scheduledNotiRepository.save(base);
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
    private LocalDateTime findNextOccurrenceStartAfter(LocalDateTime startAt, Repeat repeat, LocalDateTime from) {
        RepeatUnit unit = repeat.getUnit();
        int interval = repeat.getInterval();
        LocalDate endDate = repeat.getEndDate();
        LocalTime startTime = startAt.toLocalTime();

        switch (unit) { // 수정
            case DAY:
                return RepeatUtil.findNextDaily(startAt.toLocalDate(), startTime, interval, endDate, from);
            case WEEK:
                return RepeatUtil.findNextWeekly(startAt.toLocalDate(), startTime, interval, repeat.getOn(), endDate, from);
            case MONTH:
                return RepeatUtil.findNextMonthly(startAt.toLocalDate(), startTime, interval, repeat.getOn(), endDate, from);
            default:
                throw new IllegalArgumentException("Unsupported RepeatUnit: " + unit);
        }
    }


    //-------------summary----------------
}
