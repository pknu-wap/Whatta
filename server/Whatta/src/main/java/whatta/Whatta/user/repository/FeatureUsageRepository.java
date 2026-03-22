package whatta.Whatta.user.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import whatta.Whatta.user.entity.FeatureUsage;
import whatta.Whatta.user.enums.FeatureType;

import java.time.LocalDate;
import java.util.Optional;

public interface FeatureUsageRepository extends MongoRepository<FeatureUsage, String> {
    Optional<FeatureUsage> findByUserIdAndFeatureTypeAndUsageDate(String userId, FeatureType featureType, LocalDate usageDate);
}
