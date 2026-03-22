package whatta.Whatta.user.repository;

import whatta.Whatta.user.enums.FeatureType;

import java.time.LocalDate;

public interface FeatureUsageRepositoryCustom {
    boolean incrementTodayUsage(String userId, FeatureType featureType, LocalDate today);

    void resetOrCreateUsage(String userId, FeatureType featureType, LocalDate today);
}
