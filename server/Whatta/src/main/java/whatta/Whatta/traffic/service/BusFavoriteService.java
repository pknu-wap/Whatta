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

    private final BusFavoriteRepository itemRepository;

    //즐겨찾기 생성
    public BusFavoriteResponse createItem(String userId, BusFavoriteCreateRequest request) {
        boolean alreadyExists = itemRepository.existsByUserIdAndBusStationIdAndBusRouteId(
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

        BusFavorite savedItem = itemRepository.save(item);
        return BusFavoriteResponse.fromEntity(savedItem);
    }

    //즐겨찾기 삭제
    public void deleteItem(String userId, String itemId) {
        BusFavorite item = itemRepository.findByIdAndUserId(itemId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.RESOURCE_NOT_FOUND));

        itemRepository.delete(item);
    }

    //즐겨찾기 조회
    @Transactional(readOnly = true)
    public List<BusFavoriteResponse> getMyItems(String userId) {
        return itemRepository.findByUserId(userId).stream()
                .map(BusFavoriteResponse::fromEntity)
                .collect(Collectors.toList());
    }
}
