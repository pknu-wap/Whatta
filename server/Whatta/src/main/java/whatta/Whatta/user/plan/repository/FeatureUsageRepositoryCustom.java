package whatta.Whatta.user.plan.repository;

import whatta.Whatta.user.plan.entity.FeatureUsage;
import whatta.Whatta.user.plan.enums.FeatureType;

import java.time.LocalDate;
import java.util.Optional;

public interface FeatureUsageRepositoryCustom {
    Optional<FeatureUsage> increaseUsageIfAvailable(String userId, FeatureType featureType, LocalDate today, int dailyLimit);
}
