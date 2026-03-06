package whatta.Whatta.traffic.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.traffic.entity.BusFavorite;
import whatta.Whatta.traffic.payload.request.BusFavoriteCreateRequest;
import whatta.Whatta.traffic.payload.response.BusFavoriteResponse;
import whatta.Whatta.traffic.repository.BusFavoriteRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class BusFavoriteService {

    private final BusFavoriteRepository busFavoriteRepository;

    public BusFavoriteResponse createBusFavorite(String userId, BusFavoriteCreateRequest request) {
        boolean alreadyExists = busFavoriteRepository.existsByUserIdAndBusStationIdAndBusRouteId(
                userId,
                request.busStationId(),
                request.busRouteId()
        );
        if (alreadyExists) {
            throw new RestApiException(ErrorCode.TRAFFIC_ITEM_ALREADY_EXISTS);
        }

        BusFavorite item = BusFavorite.builder()
                .userId(userId)
                .busStationId(request.busStationId())
                .busStationName(request.busStationName())
                .busRouteId(request.busRouteId())
                .busRouteNo(request.busRouteNo())
                .build();

        BusFavorite savedItem = busFavoriteRepository.save(item);
        return BusFavoriteResponse.fromEntity(savedItem);
    }

    public void deleteBusFavorite(String userId, String itemId) {
        BusFavorite item = busFavoriteRepository.findByIdAndUserId(itemId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.RESOURCE_NOT_FOUND));

        busFavoriteRepository.delete(item);
    }

    @Transactional(readOnly = true)
    public List<BusFavoriteResponse> getMyFavorite(String userId) {
        return busFavoriteRepository.findByUserId(userId).stream()
                .map(BusFavoriteResponse::fromEntity)
                .collect(Collectors.toList());
    }
}
