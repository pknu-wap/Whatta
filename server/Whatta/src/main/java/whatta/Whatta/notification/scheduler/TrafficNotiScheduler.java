package whatta.Whatta.notification.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import whatta.Whatta.notification.service.processor.BusNotiProcessor;
import whatta.Whatta.notification.service.processor.SubwayNotiProcessor;
import whatta.Whatta.traffic.entity.TrafficNotification;
import whatta.Whatta.traffic.entity.TrafficNotificationTarget;
import whatta.Whatta.traffic.enums.TrafficTransportType;
import whatta.Whatta.traffic.repository.TrafficNotiRepository;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;

@Slf4j
@Component
@RequiredArgsConstructor
public class TrafficNotiScheduler {

    private final TrafficNotiRepository alarmRepository;
    private final BusNotiProcessor busNotiProcessor;
    private final SubwayNotiProcessor subwayNotiProcessor;
    @Qualifier("notiExecutor")
    private final Executor notiExecutor;

    //매분 0초마다 조건 체크
    @Scheduled(cron = "0 * * * * *")
    public void checkTrafficAlarms(){
        ZoneId zone = ZoneId.of("Asia/Seoul");
        LocalTime now = LocalTime.now(zone).truncatedTo(ChronoUnit.MINUTES);
        DayOfWeek today = LocalDate.now(zone).getDayOfWeek();
        int minuteOfDay = now.getHour() * 60 + now.getMinute();

        //지정된 시간과 날짜에 켜져있는 알림만 DB에서 조회
        List<TrafficNotification> targets = alarmRepository.findAlarmsToNotify(
                minuteOfDay,
                today
        );

        if (targets.isEmpty()) {
            log.debug("해당 시간에 울릴 교통 알림 없음.");
            return;
        }

        targets.forEach(this::notifyAlarmAsync);
    }

    private void notifyAlarmAsync(TrafficNotification alarm) {
        try {
            notiExecutor.execute(() -> {
                try {
                    notifyAlarm(alarm);
                } catch (Exception e) {
                    log.error("교통 알림 비동기 처리 실패. alarmId={}", alarm.getId(), e);
                }
            });
        } catch (RejectedExecutionException e) {
                log.error("교통 알림 태스크 제출 실패 (큐 초과). alarmId={}", alarm.getId(), e);
        }
    }

    private void notifyAlarm(TrafficNotification alarm) {
        Map<TrafficTransportType, List<String>> targetIdsByType = resolveTargetIdsByType(alarm);
        boolean resolvedAnyTarget = false;

        List<String> busTargetIds = targetIdsByType.getOrDefault(TrafficTransportType.BUS, List.of());
        if (!busTargetIds.isEmpty()) {
            resolvedAnyTarget = busNotiProcessor.checkAndNotify(alarm, busTargetIds) || resolvedAnyTarget;
        }

        List<String> subwayTargetIds = targetIdsByType.getOrDefault(TrafficTransportType.SUBWAY, List.of());
        if (!subwayTargetIds.isEmpty()) {
            resolvedAnyTarget = subwayNotiProcessor.checkAndNotify(alarm, subwayTargetIds) || resolvedAnyTarget;
        }

        if (!resolvedAnyTarget) {
            disableAlarm(alarm, "유효한 교통 즐겨찾기가 없는 알림 비활성화");
        }
    }

    private Map<TrafficTransportType, List<String>> resolveTargetIdsByType(TrafficNotification alarm) {
        Map<TrafficTransportType, List<String>> targetIdsByType = new EnumMap<>(TrafficTransportType.class);

        if (alarm.getTargets() == null || alarm.getTargets().isEmpty()) {
            List<String> legacyBusTargetIds = sanitizeTargetIds(alarm.getTargetItemIds());
            if (!legacyBusTargetIds.isEmpty()) {
                targetIdsByType.put(TrafficTransportType.BUS, legacyBusTargetIds);
            }
            return targetIdsByType;
        }

        for (TrafficNotificationTarget target : alarm.getTargets()) {
            if (target == null || target.getItemId() == null || target.getItemId().isBlank()) {
                continue;
            }

            TrafficTransportType transportType = target.getTransportType() != null
                    ? target.getTransportType()
                    : TrafficTransportType.BUS;

            targetIdsByType.computeIfAbsent(transportType, key -> new ArrayList<>())
                    .add(target.getItemId().trim());
        }

        return targetIdsByType;
    }

    private List<String> sanitizeTargetIds(List<String> targetItemIds) {
        if (targetItemIds == null || targetItemIds.isEmpty()) {
            return List.of();
        }

        return targetItemIds.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(id -> !id.isBlank())
                .distinct()
                .toList();
    }

    private void disableAlarm(TrafficNotification alarm, String reason) {
        if (!alarm.isEnabled()) {
            return;
        }

        TrafficNotification disabledAlarm = alarm.toBuilder()
                .isEnabled(false)
                .build();

        alarmRepository.save(disabledAlarm);
        log.info("Traffic alarm disabled. alarmId={}, reason={}", alarm.getId(), reason);
    }
}
