package whatta.Whatta.notification.service.processor;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import whatta.Whatta.notification.enums.NotificationSendResult;
import whatta.Whatta.notification.service.NotificationSendService;
import whatta.Whatta.traffic.entity.SubwayFavorite;
import whatta.Whatta.traffic.entity.TrafficNotification;
import whatta.Whatta.traffic.payload.response.SubwayScheduleResponse;
import whatta.Whatta.traffic.repository.SubwayFavoriteRepository;
import whatta.Whatta.traffic.repository.TrafficNotiRepository;
import whatta.Whatta.traffic.service.SubwayService;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubwayNotiProcessor {

    private final SubwayFavoriteRepository subwayFavoriteRepository;
    private final SubwayService subwayService;
    private final NotificationSendService notificationSendService;
    private final TrafficNotiRepository alarmRepository;

    public boolean checkAndNotify(TrafficNotification alarm, List<String> itemIds) {
        List<SubwayFavorite> favorites = resolveFavorites(alarm.getUserId(), itemIds);

        if (favorites.isEmpty()) {
            return false;
        }

        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul")).truncatedTo(ChronoUnit.MINUTES);
        StringBuilder notificationBody = new StringBuilder();
        int trainsNotifiedCount = 0;

        for (SubwayFavorite favorite : favorites) {
            SubwayScheduleResponse nextTrain = subwayService.findNextTrain(
                            favorite.getSubwayStationId(),
                            favorite.getUpDownTypeCode(),
                            now
                    )
                    .orElse(null);

            if (nextTrain == null) {
                continue;
            }

            notificationBody.append(
                    String.format("[%s] %s %s 다음 열차 %s (종착역 %s)\n",
                            favorite.getSubwayStationName(),
                            favorite.getSubwayRouteName(),
                            resolveDirectionLabel(favorite.getUpDownTypeCode()),
                            resolveDisplayTime(nextTrain),
                            resolveEndStationName(nextTrain)
                    )
            );
            trainsNotifiedCount++;
        }

        if (trainsNotifiedCount > 0) {
            String title = String.format("🚨 %d건의 지하철 알림이 있습니다.", trainsNotifiedCount);
            NotificationSendResult sendResult = notificationSendService.sendTrafficAlarm(
                    alarm.getUserId(),
                    title,
                    notificationBody.toString().trim()
            );

            if (sendResult != NotificationSendResult.SUCCESS) {
                log.info("지하철 교통알림이 스킵되거나 실패함. alarmId={}", alarm.getId());
            }
            handleRepeatOption(alarm);
            return true;
        }

        NotificationSendResult sendResult = notificationSendService.sendTrafficAlarm(
                alarm.getUserId(),
                "🚨 남은 지하철 운행 정보가 없습니다.",
                "선택하신 지하철 노선은 현재 시간 이후 운행 정보가 없습니다."
        );

        if (sendResult != NotificationSendResult.SUCCESS) {
            log.info("지하철 교통알림이 스킵되거나 실패함. alarmId={}", alarm.getId());
        }
        handleRepeatOption(alarm);
        return true;
    }

    private List<SubwayFavorite> resolveFavorites(String userId, List<String> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }

        List<String> sanitizedIds = ids.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(id -> !id.isBlank())
                .distinct()
                .toList();

        if (sanitizedIds.isEmpty()) {
            return List.of();
        }

        return subwayFavoriteRepository.findByIdInAndUserId(sanitizedIds, userId);
    }

    private void handleRepeatOption(TrafficNotification alarm) {
        if (!alarm.isRepeatEnabled()) {
            disableAlarm(alarm, "일회성 지하철 알림 비활성화");
        }
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

    private String resolveDirectionLabel(String upDownTypeCode) {
        return "U".equalsIgnoreCase(upDownTypeCode) ? "상행" : "하행";
    }

    private String resolveDisplayTime(SubwayScheduleResponse response) {
        if (response.arrivalTime() != null && !response.arrivalTime().isBlank()) {
            return response.arrivalTime();
        }
        if (response.departureTime() != null && !response.departureTime().isBlank()) {
            return response.departureTime();
        }
        return "--:--:--";
    }

    private String resolveEndStationName(SubwayScheduleResponse response) {
        if (response.endSubwayStationName() == null || response.endSubwayStationName().isBlank()) {
            return "정보없음";
        }
        return response.endSubwayStationName();
    }
}
