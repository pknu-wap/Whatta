package whatta.Whatta.traffic.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import whatta.Whatta.traffic.entity.SubwayFavorite;

import java.util.List;
import java.util.Optional;

public interface SubwayFavoriteRepository extends MongoRepository<SubwayFavorite, String> {

    List<SubwayFavorite> findByUserId(String userId);

    Optional<SubwayFavorite> findByIdAndUserId(String id, String userId);

    Optional<SubwayFavorite> findByUserIdAndSubwayStationIdAndSubwayRouteNameAndUpDownTypeCode(
            String userId,
            String subwayStationId,
            String subwayRouteName,
            String upDownTypeCode
    );

    List<SubwayFavorite> findByIdInAndUserId(List<String> ids, String userId);
}
