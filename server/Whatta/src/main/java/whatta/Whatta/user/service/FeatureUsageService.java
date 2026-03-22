package whatta.Whatta.user.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.user.entity.FeatureUsage;
import whatta.Whatta.user.entity.UserPlan;
import whatta.Whatta.user.enums.FeatureType;
import whatta.Whatta.user.enums.PlanType;
import whatta.Whatta.user.repository.FeatureUsageRepository;
import whatta.Whatta.user.repository.UserPlanRepository;

import java.time.LocalDate;

@Service
@Slf4j
@RequiredArgsConstructor
public class FeatureUsageService {

    private static final int FREE_DAILY_AI_AGENT_LIMIT = 3;

    private final UserPlanRepository userPlanRepository;
    private final FeatureUsageRepository featureUsageRepository;

    public void validateAvailableUsage(String userId, FeatureType featureType) {
        UserPlan userPlan = ensureUserPlan(userId);
        if (userPlan.getPlanType() != PlanType.FREE) {
            return;
        }

        int usedCount = getTodayUsedCount(userId, featureType);
        if (featureType == FeatureType.AI_AGENT && usedCount >= FREE_DAILY_AI_AGENT_LIMIT) {
            throw new RestApiException(ErrorCode.AI_DAILY_USAGE_LIMIT_EXCEEDED);
        }
    }

    public Integer recordSuccessfulUsageSafely(String userId, FeatureType featureType) {
        try {
            return recordSuccessfulUsage(userId, featureType);
        } catch (Exception e) {
            log.error("[FEATURE_USAGE][RECORD_FAILED] userId={} featureType={} message={}",
                    userId,
                    featureType,
                    e.getMessage(),
                    e);
            return getRemainingCount(userId, featureType);
        }
    }

    public Integer getRemainingCount(String userId, FeatureType featureType) {
        UserPlan userPlan = ensureUserPlan(userId);
        if (userPlan.getPlanType() != PlanType.FREE) {
            return null;
        }

        return Math.max(resolveDailyLimit(featureType) -  getTodayUsedCount(userId, featureType), 0);
    }

    private Integer recordSuccessfulUsage(String userId, FeatureType featureType) {
        UserPlan userPlan = ensureUserPlan(userId);
        if (userPlan.getPlanType() != PlanType.FREE) {
            return null;
        }

        LocalDate today = LocalDate.now();
        if (featureUsageRepository.incrementTodayUsage(userId, featureType, today)) {
            return getRemainingCount(userId, featureType);
        }

        featureUsageRepository.resetOrCreateUsage(userId, featureType, today);
        return getRemainingCount(userId, featureType);
    }

    private int resolveDailyLimit(FeatureType featureType) {
        if (featureType == FeatureType.AI_AGENT) {
            return FREE_DAILY_AI_AGENT_LIMIT;
        }
        return Integer.MAX_VALUE;
    }

    private int getTodayUsedCount(String userId, FeatureType featureType) {
        LocalDate today = LocalDate.now();
        return featureUsageRepository.findByUserIdAndFeatureType(userId, featureType)
                .filter(featureUsage -> today.equals(featureUsage.getUsageDate()))
                .map(FeatureUsage::getUsedCount)
                .orElse(0);
    }

    private UserPlan ensureUserPlan(String userId) {
        return userPlanRepository.findByUserId(userId)
                .orElseGet(() -> userPlanRepository.save(UserPlan.builder()
                        .userId(userId)
                        .build()));
    }
}
