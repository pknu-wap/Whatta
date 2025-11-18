package whatta.Whatta.traffic.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.traffic.entity.BusItem;
import whatta.Whatta.traffic.entity.TrafficAlarm;
import whatta.Whatta.traffic.payload.request.BusItemCreateRequest;
import whatta.Whatta.traffic.payload.request.TrafficAlarmCreateRequest;
import whatta.Whatta.traffic.payload.request.TrafficAlarmUpdateRequest;
import whatta.Whatta.traffic.payload.response.TrafficAlarmResponse;
import whatta.Whatta.traffic.repository.TrafficAlarmRepository;
import whatta.Whatta.traffic.repository.BusItemRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class TrafficAlarmService {

    private final BusItemRepository itemRepository;
    private final TrafficAlarmRepository alarmRepository;

    //교통알림 생성
    public TrafficAlarmResponse createAlarm(String userId, TrafficAlarmCreateRequest request) {
        validateTrafficItems(userId, request.targetItemIds( ));

        TrafficAlarm alarm = TrafficAlarm.builder()
                .userId(userId)
                .alarmTime(request.alarmTime())
                .days(request.days())
                .targetItemIds(request.targetItemIds())
                .isEnabled(true)
                .build();

        TrafficAlarm savedAlarm = alarmRepository.save(alarm);
        return TrafficAlarmResponse.fromEntity(savedAlarm);
    }

    //교통알림 수정
    public TrafficAlarmResponse updateAlarm(String userId, String alarmId, TrafficAlarmUpdateRequest request) {
        TrafficAlarm originalAlarm = alarmRepository.findByIdAndUserId(alarmId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.RESOURCE_NOT_FOUND));

        if (request.getTargetItemIds() != null) {
            validateTrafficItems(userId, request.getTargetItemIds());
        }

        TrafficAlarm.TrafficAlarmBuilder builder = originalAlarm.toBuilder();

        if (request.getAlarmTime() != null) builder.alarmTime(request.getAlarmTime());
        if (request.getDays() != null) builder.days(request.getDays());
        if (request.getIsEnabled() != null) builder.isEnabled(request.getIsEnabled());
        if (request.getTargetItemIds() != null) builder.targetItemIds(request.getTargetItemIds());

        TrafficAlarm updatedAlarm = builder.build();
        TrafficAlarm savedAlarm = alarmRepository.save(updatedAlarm);

        return TrafficAlarmResponse.fromEntity(savedAlarm);
    }

    //교통알림 삭제
    public void deleteAlarm(String userId, String alarmId) {
        TrafficAlarm alarm = alarmRepository.findByIdAndUserId(alarmId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.RESOURCE_NOT_FOUND));

        alarmRepository.delete(alarm);
    }

    //교통알림 목록 조회
    @Transactional(readOnly = true)
    public List<TrafficAlarmResponse> getTrafficAlarms(String userId){
        return alarmRepository.findByUserId(userId).stream()
                .map(TrafficAlarmResponse::fromEntity)
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


