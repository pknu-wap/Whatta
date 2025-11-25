package whatta.Whatta.traffic.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import whatta.Whatta.traffic.entity.BusItem;

import java.util.List;
import java.util.Optional;

public interface BusItemRepository extends MongoRepository<BusItem, String> {

    List<BusItem> findByUserId(String userId);

    Optional<BusItem> findByIdAndUserId(String id, String userId);

    long countByIdInAndUserId(List<String> ids, String userId);
}
