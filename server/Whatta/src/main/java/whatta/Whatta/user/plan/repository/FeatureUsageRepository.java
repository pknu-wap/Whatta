package whatta.Whatta.user.plan.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import whatta.Whatta.user.plan.entity.FeatureUsage;
import whatta.Whatta.user.plan.enums.FeatureType;

import java.util.Optional;

public interface FeatureUsageRepository extends MongoRepository<FeatureUsage, String>, FeatureUsageRepositoryCustom {

    Optional<FeatureUsage> findByUserIdAndFeatureType(String userId, FeatureType featureType);
}
