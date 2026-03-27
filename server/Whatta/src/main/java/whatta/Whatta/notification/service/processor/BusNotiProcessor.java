package whatta.Whatta.notification.service.processor;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import whatta.Whatta.notification.enums.NotificationSendResult;
import whatta.Whatta.notification.service.NotificationSendService;
import whatta.Whatta.traffic.TrafficConstants;
import whatta.Whatta.traffic.entity.BusFavorite;
import whatta.Whatta.traffic.entity.TrafficNotification;
import whatta.Whatta.traffic.payload.response.BusArrivalResponse;
import whatta.Whatta.traffic.repository.BusFavoriteRepository;
import whatta.Whatta.traffic.repository.TrafficNotiRepository;
import whatta.Whatta.traffic.service.BusService;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BusNotiProcessor {

    private final BusFavoriteRepository busFavoriteRepository;
    private final BusService busService;
    private final NotificationSendService notificationSendService;
    private final TrafficNotiRepository alarmRepository;



    public boolean checkAndNotify(TrafficNotification alarm, List<String> itemIds) {
        List<BusFavorite> favorites = resolveFavorites(alarm.getUserId(), itemIds);

        if (favorites.isEmpty()) {
            return false;
        }

        Map<String, List<BusFavorite>> favoritesByStation = favorites.stream()
                .collect(Collectors.groupingBy(BusFavorite:: getBusStationId));

        StringBuilder notificationBody = new StringBuilder();
        int busesNotifiedCount = 0;

        for(Map.Entry<String, List<BusFavorite>> entry : favoritesByStation.entrySet()) {
            String busStationId = entry.getKey();
            List<BusFavorite> stationItems = entry.getValue();
            String cityCode = resolveCityCode(stationItems.get(0).getCityCode());

            List<BusArrivalResponse> allArrivals = busService.searchArrivalsByStation(busStationId, cityCode);

            for (BusArrivalResponse arrival : allArrivals) {
                // 현재 아이템 목록에 이 버스가 포함되어 있는지 확인
                boolean isTarget = stationItems.stream()
                        .anyMatch(item -> item.getBusRouteNo().equals(arrival.busRouteNo()));

                if (isTarget) {
                    notificationBody.append(
                            String.format("[%s] %s번 버스 : %d분 뒤 도착 예정 (남은 정류장 %d)\n",
                                    arrival.busStationName(),
                                    arrival.busRouteNo(),
                                    arrival.etaSeconds() / 60,
                                    arrival.remainingBusStops()
                            )
                    );
                    busesNotifiedCount++;
                }
            }
        }

        if (busesNotifiedCount > 0) {
            String title = String.format("🚨 %d건의 버스 도착 알림이 있습니다.", busesNotifiedCount);
            NotificationSendResult sendResult = notificationSendService.sendTrafficAlarm(
                    alarm.getUserId(),
                    title,
                    notificationBody.toString().trim()
            );

            if (sendResult != NotificationSendResult.SUCCESS) {
                log.info("버스 교통알림이 스킵되거나 실패함. alarmId={}", alarm.getId());
            }
            handleRepeatOption(alarm);
            return true;
        }

        NotificationSendResult sendResult = notificationSendService.sendTrafficAlarm(
                alarm.getUserId(),
                "🚨 현재 운행 중인 버스가 없습니다.",
                "선택하신 버스 노선은 회차 대기 지연 혹은 운행시간이 종료되어 현재 운행정보가 없습니다."
        );

        if (sendResult != NotificationSendResult.SUCCESS) {
            log.info("버스 교통알림이 스킵되거나 실패함. alarmId={}", alarm.getId());
        }
        handleRepeatOption(alarm);
        return true;
    }

    private List<BusFavorite> resolveFavorites(String userId, List<String> ids) {
        if (ids == null || ids.isEmpty()) return List.of();

        List<String> sanitizedIds = ids.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(id -> !id.isBlank())
                .distinct()
                .toList();

        if (sanitizedIds.isEmpty()) return List.of();

        return busFavoriteRepository.findByIdInAndUserId(sanitizedIds, userId);
    }

    //반복 안 함 설정이면 알림 비활성화 처리
    private void handleRepeatOption(TrafficNotification alarm){
        if(!alarm.isRepeatEnabled()) {
            disableAlarm(alarm, "일회성 알림 비활성화");
        }
    }

    //즐겨찾기 대상이 없거나 일회성 처리 완료 시 알림 비활성화
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

    private String resolveCityCode(String cityCode) {
        if (cityCode == null || cityCode.isBlank()) {
            return TrafficConstants.DEFAULT_CITY_CODE;
        }
        return cityCode.trim();
    }

}
