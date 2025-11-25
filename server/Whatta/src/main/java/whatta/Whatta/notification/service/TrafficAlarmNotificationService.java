package whatta.Whatta.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import whatta.Whatta.traffic.entity.BusItem;
import whatta.Whatta.traffic.entity.TrafficAlarm;
import whatta.Whatta.traffic.payload.response.BusArrivalResponse;
import whatta.Whatta.traffic.repository.BusItemRepository;
import whatta.Whatta.traffic.service.TrafficService;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TrafficAlarmNotificationService {

    private final BusItemRepository itemRepository;
    private final TrafficService trafficService;
    private final NotificationSendService notificationSendService;



    public void CheckAndNotify(TrafficAlarm alarm) {
        //알림에 연결된 버스목록 조회
        List<BusItem> items = itemRepository.findAllById(alarm.getTargetItemIds());

        if(items.isEmpty()) return;

        //버스정류장ID을 기준으로 그룹핑
        Map<String, List<BusItem>> itemsByStation = items.stream()
                .collect(Collectors.groupingBy(BusItem :: getBusStationId));

        StringBuilder notificationBody = new StringBuilder();
        int busesNotifiedCount = 0;

        for(Map.Entry<String, List<BusItem>> entry : itemsByStation.entrySet()) {
            String busStationId = entry.getKey();
            List<BusItem> stationItems = entry.getValue();

            List<BusArrivalResponse> allArrivals = trafficService.searchArrivalsByStation(busStationId);

            for (BusArrivalResponse arrival : allArrivals) {
                // 현재 아이템 목록에 이 버스가 포함되어 있는지 확인
                boolean isTarget = stationItems.stream()
                        .anyMatch(item -> item.getBusRouteNo().equals(arrival.busRouteNo()));


                if (isTarget) {
                    notificationBody.append(
                            String.format("%s번 버스: %d분 뒤 %s 에 도착 예정 ( %d 정류장 전) \n",
                                    arrival.busRouteNo(),
                                    arrival.etaSeconds() / 60,
                                    arrival.busStationName(),
                                    arrival.remainingBusStops()
                            )
                    );
                    busesNotifiedCount++;
                }
            }
        }

        if (busesNotifiedCount > 0) {
            String title = String.format("🚨 %d건의 버스 도착 알림이 있습니다.", busesNotifiedCount);
            notificationSendService.sendTrafficAlarm(
                    alarm.getUserId(),
                    title,
                    notificationBody.toString().trim()
            );
        }
        if (busesNotifiedCount == 0) {
            notificationSendService.sendTrafficAlarm(
                    alarm.getUserId(),
                    "🚨 현재 운행 중인 버스가 없습니다.",
                    "선택하신 교통수단이 회차 대기 지연 혹은 운행시간이 종료되어 현재 운행정보가 없습니다."
            );
        }
    }
}
