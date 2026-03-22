package whatta.Whatta.user.repository;

import whatta.Whatta.user.entity.FeatureUsage;
import whatta.Whatta.user.enums.FeatureType;

import java.time.LocalDate;
import java.util.Optional;

public interface FeatureUsageRepositoryCustom {
    Optional<FeatureUsage> increaseUsageIfAvailable(String userId, FeatureType featureType, LocalDate today, int dailyLimit);
}
