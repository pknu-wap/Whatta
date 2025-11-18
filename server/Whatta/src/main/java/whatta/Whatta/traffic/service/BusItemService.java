package whatta.Whatta.traffic.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.traffic.entity.BusItem;
import whatta.Whatta.traffic.payload.request.BusItemCreateRequest;
import whatta.Whatta.traffic.payload.response.BusItemResponse;
import whatta.Whatta.traffic.repository.BusItemRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class BusItemService {

    private final BusItemRepository itemRepository;

    //즐겨찾기 생성
    public BusItemResponse createItem(String userId, BusItemCreateRequest request) {

        BusItem item = BusItem.builder()
                .userId(userId)
                .busStationId(request.busStationId())
                .busStationName(request.busStationName())
                .busRouteId(request.busRouteId())
                .busRouteNo(request.busRouteNo())
                .build();

        BusItem savedItem = itemRepository.save(item);
        return BusItemResponse.fromEntity(savedItem);
    }

    //즐겨찾기 삭제
    public void deleteItem(String userId, String itemId) {
        BusItem item = itemRepository.findByIdAndUserId(itemId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.RESOURCE_NOT_FOUND));

        itemRepository.delete(item);
    }

    //즐겨찾기 조회
    @Transactional(readOnly = true)
    public List<BusItemResponse> getMyItems(String userId) {
        return itemRepository.findByUserId(userId).stream()
                .map(BusItemResponse::fromEntity)
                .collect(Collectors.toList());
    }
}
