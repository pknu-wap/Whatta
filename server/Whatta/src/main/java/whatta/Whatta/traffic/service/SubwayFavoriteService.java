package whatta.Whatta.traffic.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.traffic.entity.SubwayFavorite;
import whatta.Whatta.traffic.payload.request.SubwayFavoriteCreateRequest;
import whatta.Whatta.traffic.payload.response.SubwayFavoriteResponse;
import whatta.Whatta.traffic.repository.SubwayFavoriteRepository;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class SubwayFavoriteService {

    private final SubwayFavoriteRepository subwayFavoriteRepository;

    public SubwayFavoriteResponse createSubwayFavorite(String userId, SubwayFavoriteCreateRequest request) {
        Optional<SubwayFavorite> existingFavorite =
                subwayFavoriteRepository.findByUserIdAndSubwayStationIdAndSubwayRouteNameAndUpDownTypeCode(
                        userId,
                        request.subwayStationId(),
                        request.subwayRouteName(),
                        request.upDownTypeCode()
                );

        if (existingFavorite.isPresent()) {
            SubwayFavorite favorite = existingFavorite.get();
            log.info("지하철 즐겨찾기 중복데이터 감지: 기존 ID({})", favorite.getId());
            return SubwayFavoriteResponse.fromEntity(favorite);
        }

        SubwayFavorite favorite = SubwayFavorite.builder()
                .userId(userId)
                .subwayStationId(request.subwayStationId())
                .subwayStationName(request.subwayStationName())
                .subwayRouteName(request.subwayRouteName())
                .upDownTypeCode(request.upDownTypeCode())
                .build();

        try {
            SubwayFavorite savedFavorite = subwayFavoriteRepository.save(favorite);
            return SubwayFavoriteResponse.fromEntity(savedFavorite);
        } catch (DuplicateKeyException e) {
            log.info("지하철 즐겨찾기 중복 삽입 레이스 감지, 기존 데이터 재조회");

            return subwayFavoriteRepository.findByUserIdAndSubwayStationIdAndSubwayRouteNameAndUpDownTypeCode(
                            userId,
                            request.subwayStationId(),
                            request.subwayRouteName(),
                            request.upDownTypeCode()
                    )
                    .map(SubwayFavoriteResponse::fromEntity)
                    .orElseThrow(() -> new RestApiException(ErrorCode.SUBWAY_ITEM_ALREADY_EXISTS));
        }
    }

    public void deleteSubwayFavorite(String userId, String itemId) {
        SubwayFavorite favorite = subwayFavoriteRepository.findByIdAndUserId(itemId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.RESOURCE_NOT_FOUND));

        subwayFavoriteRepository.delete(favorite);
    }

    @Transactional(readOnly = true)
    public List<SubwayFavoriteResponse> getMyFavorite(String userId) {
        return subwayFavoriteRepository.findByUserId(userId).stream()
                .map(SubwayFavoriteResponse::fromEntity)
                .collect(Collectors.toList());
    }
}
