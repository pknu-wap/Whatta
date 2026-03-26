package whatta.Whatta.traffic.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.traffic.TrafficConstants;
import whatta.Whatta.traffic.entity.BusFavorite;
import whatta.Whatta.traffic.payload.request.BusFavoriteCreateRequest;
import whatta.Whatta.traffic.payload.response.BusFavoriteResponse;
import whatta.Whatta.traffic.repository.BusFavoriteRepository;
import whatta.Whatta.user.setting.entity.UserSetting;
import whatta.Whatta.user.setting.repository.UserSettingRepository;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class BusFavoriteService {

    private final BusFavoriteRepository busFavoriteRepository;
    private final UserSettingRepository userSettingRepository;

    public BusFavoriteResponse createBusFavorite(String userId, BusFavoriteCreateRequest request) {
        Optional<BusFavorite> existingFavorite = busFavoriteRepository.findByUserIdAndBusStationIdAndBusRouteId(
                userId,
                request.busStationId(),
                request.busRouteId()
        );

        if (existingFavorite.isPresent()) {
            BusFavorite favorite = existingFavorite.get();
            log.info("버스 즐겨찾기 중복데이터 감지: 기존 ID({})", favorite.getId());
            return BusFavoriteResponse.fromEntity(favorite);
        }

        BusFavorite favorite = BusFavorite.builder()
                .userId(userId)
                .busStationId(request.busStationId())
                .busStationName(request.busStationName())
                .busRouteId(request.busRouteId())
                .busRouteNo(request.busRouteNo())
                .cityCode(resolveCityCode(userId, request.cityCode()))
                .build();
        try {
            BusFavorite savedFavorite = busFavoriteRepository.save(favorite);
            return BusFavoriteResponse.fromEntity(savedFavorite);
        } catch (DuplicateKeyException e) {
            log.info("버스 즐겨찾기 중복 삽입 레이스 감지, 기존 데이터 재조회");

            return busFavoriteRepository.findByUserIdAndBusStationIdAndBusRouteId(
                            userId,
                            request.busStationId(),
                            request.busRouteId()
                    )
                    .map(BusFavoriteResponse::fromEntity)
                    .orElseThrow(() -> new RestApiException(ErrorCode.TRAFFIC_ITEM_ALREADY_EXISTS));
        }
    }

    public void deleteBusFavorite(String userId, String itemId) {
        BusFavorite favorite = busFavoriteRepository.findByIdAndUserId(itemId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.RESOURCE_NOT_FOUND));

        busFavoriteRepository.delete(favorite);
    }

    @Transactional(readOnly = true)
    public List<BusFavoriteResponse> getMyFavorite(String userId) {
        return busFavoriteRepository.findByUserId(userId).stream()
                .map(BusFavoriteResponse::fromEntity)
                .collect(Collectors.toList());
    }

    private String resolveCityCode(String cityCode) {
        if (cityCode == null || cityCode.isBlank()) {
            return TrafficConstants.DEFAULT_CITY_CODE;
        }
        return cityCode.trim();
    }

    private String resolveCityCode(String userId, String cityCode) {
        if (cityCode != null && !cityCode.isBlank()) {
            return cityCode.trim();
        }

        return userSettingRepository.findByUserId(userId)
                .map(UserSetting::getCityCode)
                .map(this::resolveCityCode)
                .orElse(TrafficConstants.DEFAULT_CITY_CODE);
    }
}
