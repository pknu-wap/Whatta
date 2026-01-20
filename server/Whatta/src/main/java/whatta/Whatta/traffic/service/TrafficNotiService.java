package whatta.Whatta.traffic.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.traffic.entity.TrafficNotification;
import whatta.Whatta.traffic.payload.request.TrafficNotiCreateRequest;
import whatta.Whatta.traffic.payload.request.TrafficNotiUpdateRequest;
import whatta.Whatta.traffic.payload.response.TrafficNotiResponse;
import whatta.Whatta.traffic.repository.TrafficNotiRepository;
import whatta.Whatta.traffic.repository.BusItemRepository;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class TrafficNotiService {

    private final BusItemRepository itemRepository;
    private final TrafficNotiRepository trafficNotiRepository;

    //교통알림 생성
    public TrafficNotiResponse createTrafficNoti(String userId, TrafficNotiCreateRequest request) {
        validateTrafficItems(userId, request.targetItemIds( ));

        LocalTime cleanTime = request.alarmTime().truncatedTo(ChronoUnit.MINUTES);

        Set<DayOfWeek> days = (request.days() != null) ? request.days() : new HashSet<>();
        boolean shouldRepeat = !days.isEmpty();

        TrafficNotification alarm = TrafficNotification.builder()
                .userId(userId)
                .alarmTime(cleanTime)
                .days(request.days() != null ? request.days() : new HashSet<>())
                .targetItemIds(request.targetItemIds())
                .isEnabled(true)
                .isRepeatEnabled(shouldRepeat)
                .build();

        TrafficNotification savedAlarm = trafficNotiRepository.save(alarm);
        return TrafficNotiResponse.fromEntity(savedAlarm);
    }

    //교통알림 수정
    public TrafficNotiResponse updateTrafficNoti(String userId, String alarmId, TrafficNotiUpdateRequest request) {
        TrafficNotification originalAlarm = trafficNotiRepository.findByIdAndUserId(alarmId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.RESOURCE_NOT_FOUND));

        if (request.getTargetItemIds() != null) {
            validateTrafficItems(userId, request.getTargetItemIds());
        }

        TrafficNotification.TrafficNotificationBuilder builder = originalAlarm.toBuilder();

        if (request.getAlarmTime() != null) builder.alarmTime(request.getAlarmTime()
                .truncatedTo(ChronoUnit.MINUTES));
        if (request.getDays() != null) {
            builder.days(request.getDays());
            boolean shouldRepeat = !request.getDays().isEmpty();
            builder.isRepeatEnabled(shouldRepeat);
        }
        if (request.getIsEnabled() != null) builder.isEnabled(request.getIsEnabled());
        if (request.getTargetItemIds() != null) builder.targetItemIds(request.getTargetItemIds());

        //요일값이 없을경우 반복 off
        TrafficNotification temp = builder.build();
        if (temp.getDays() == null || temp.getDays().isEmpty()) {
            builder.isRepeatEnabled(false);
        }

        TrafficNotification updatedAlarm = builder.build();
        TrafficNotification savedAlarm = trafficNotiRepository.save(updatedAlarm);

        return TrafficNotiResponse.fromEntity(savedAlarm);
    }

    //교통알림 삭제
    public void deleteTrafficNoti(String userId, String alarmId) {
        TrafficNotification alarm = trafficNotiRepository.findByIdAndUserId(alarmId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.RESOURCE_NOT_FOUND));

        trafficNotiRepository.delete(alarm);
    }

    //교통알림 목록 조회
    @Transactional(readOnly = true)
    public List<TrafficNotiResponse> getTrafficNotis(String userId){
        return trafficNotiRepository.findByUserId(userId).stream()
                .map(TrafficNotiResponse::fromEntity)
                .collect(Collectors.toList());
    }

    //유효성 검증
    private void validateTrafficItems(String userId, List<String> itemIds) {
        if(itemIds == null || itemIds.isEmpty()) return;

        long validCount = itemRepository.countByIdInAndUserId(itemIds, userId);

        if(validCount != itemIds.size()) {
            throw new RestApiException(ErrorCode.RESOURCE_NOT_FOUND);
        }
    }
}


