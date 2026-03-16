package whatta.Whatta.traffic.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import whatta.Whatta.traffic.entity.BusFavorite;

import java.util.List;
import java.util.Optional;

public interface BusFavoriteRepository extends MongoRepository<BusFavorite, String> {

    List<BusFavorite> findByUserId(String userId);

    Optional<BusFavorite> findByIdAndUserId(String id, String userId);

    long countByIdInAndUserId(List<String> ids, String userId);

    Optional<BusFavorite> findByUserIdAndBusStationIdAndBusRouteId(String userId, String busStationId, String busRouteId);

    List<BusFavorite> findByIdInAndUserId(List<String> ids, String userId);
}
