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
import whatta.Whatta.traffic.repository.BusFavoriteRepository;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class TrafficNotiService {

    private final BusFavoriteRepository busFavoriteRepository;
    private final TrafficNotiRepository trafficNotiRepository;

    public TrafficNotiResponse createTrafficNoti(String userId, TrafficNotiCreateRequest request) {
        List<String> targetItemIds = sanitizeTargetItemIds(request.targetItemIds());
        validateTrafficItems(userId, targetItemIds);

        LocalTime cleanTime = request.alarmTime().truncatedTo(ChronoUnit.MINUTES);

        Set<DayOfWeek> days = (request.days() != null) ? request.days() : new HashSet<>();
        boolean shouldRepeat = !days.isEmpty();

        TrafficNotification alarm = TrafficNotification.builder()
                .userId(userId)
                .alarmTime(cleanTime)
                .days(request.days() != null ? request.days() : new HashSet<>())
                .targetItemIds(targetItemIds)
                .isEnabled(true)
                .isRepeatEnabled(shouldRepeat)
                .build();

        TrafficNotification savedAlarm = trafficNotiRepository.save(alarm);
        return TrafficNotiResponse.fromEntity(savedAlarm);
    }

    public TrafficNotiResponse updateTrafficNoti(String userId, String alarmId, TrafficNotiUpdateRequest request) {
        TrafficNotification originalAlarm = trafficNotiRepository.findByIdAndUserId(alarmId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.RESOURCE_NOT_FOUND));

        List<String> sanitizedTargetItemIds = null;
        if (request.targetItemIds() != null) {
            sanitizedTargetItemIds = sanitizeTargetItemIds(request.targetItemIds());
            validateTrafficItems(userId, sanitizedTargetItemIds);
        }

        TrafficNotification.TrafficNotificationBuilder builder = originalAlarm.toBuilder();

        if (request.alarmTime() != null) builder.alarmTime(request.alarmTime()
                .truncatedTo(ChronoUnit.MINUTES));
        if (request.days() != null) {
            builder.days(request.days());
            boolean shouldRepeat = !request.days().isEmpty();
            builder.isRepeatEnabled(shouldRepeat);
        }
        if (request.isEnabled() != null) builder.isEnabled(request.isEnabled());
        if (sanitizedTargetItemIds != null) builder.targetItemIds(sanitizedTargetItemIds);

        //요일값이 없을경우 반복 off
        TrafficNotification temp = builder.build();
        if (temp.getDays() == null || temp.getDays().isEmpty()) {
            builder.isRepeatEnabled(false);
        }

        TrafficNotification updatedAlarm = builder.build();
        TrafficNotification savedAlarm = trafficNotiRepository.save(updatedAlarm);

        return TrafficNotiResponse.fromEntity(savedAlarm);
    }

    public void deleteTrafficNoti(String userId, String alarmId) {
        TrafficNotification alarm = trafficNotiRepository.findByIdAndUserId(alarmId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.RESOURCE_NOT_FOUND));

        trafficNotiRepository.delete(alarm);
    }

    @Transactional(readOnly = true)
    public List<TrafficNotiResponse> getTrafficNotis(String userId){
        return trafficNotiRepository.findByUserId(userId).stream()
                .map(TrafficNotiResponse::fromEntity)
                .collect(Collectors.toList());
    }

    private void validateTrafficItems(String userId, List<String> itemIds) {
        long validCount = busFavoriteRepository.countByIdInAndUserId(itemIds, userId);

        if(validCount != itemIds.size()) {
            throw new RestApiException(ErrorCode.RESOURCE_NOT_FOUND);
        }
    }

    private List<String> sanitizeTargetItemIds(List<String> itemIds) {
        if (itemIds == null || itemIds.isEmpty()) {
            throw new RestApiException(ErrorCode.INVALID_TRAFFIC_ALARM_REQUEST);
        }

        List<String> sanitized = itemIds.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(id -> !id.isBlank())
                .distinct()
                .toList();

        if (sanitized.size() != itemIds.size()) {
            throw new RestApiException(ErrorCode.INVALID_TRAFFIC_ALARM_REQUEST);
        }

        return new ArrayList<>(sanitized);
    }
}
