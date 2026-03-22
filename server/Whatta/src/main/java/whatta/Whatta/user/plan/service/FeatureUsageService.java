package whatta.Whatta.user.plan.service;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.user.plan.entity.FeatureUsage;
import whatta.Whatta.user.plan.entity.UserPlan;
import whatta.Whatta.user.plan.enums.FeatureType;
import whatta.Whatta.user.plan.enums.PlanType;
import whatta.Whatta.user.plan.repository.FeatureUsageRepository;
import whatta.Whatta.user.plan.repository.UserPlanRepository;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class FeatureUsageService {

    private static final int FREE_DAILY_AI_AGENT_LIMIT = 3;

    private final UserPlanRepository userPlanRepository;
    private final FeatureUsageRepository featureUsageRepository;

    public Integer increaseUsageIfAvailableOrThrow(String userId, FeatureType featureType) {
        UserPlan userPlan = ensureUserPlan(userId);
        if (userPlan.getPlanType() != PlanType.FREE) {
            return null;
        }

        int dailyLimit = resolveDailyLimit(featureType);
        FeatureUsage featureUsage = featureUsageRepository
                .increaseUsageIfAvailable(userId, featureType, LocalDate.now(), dailyLimit)
                .orElseThrow(() -> new RestApiException(ErrorCode.AI_DAILY_USAGE_LIMIT_EXCEEDED));
        return Math.max(dailyLimit - featureUsage.getUsedCount(), 0);
    }

    private int resolveDailyLimit(FeatureType featureType) {
        return switch (featureType) {
            case AI_AGENT -> FREE_DAILY_AI_AGENT_LIMIT;
            case OCR -> Integer.MAX_VALUE; //TODO: 추후에 정책 합의 후 변경 예정
            case TRAFFIC -> Integer.MAX_VALUE; //TODO: 추후에 정책 합의 후 변경 예정
        };
    }

    private UserPlan ensureUserPlan(String userId) {
        return userPlanRepository.findByUserId(userId)
                .orElseGet(() -> createUserPlanSafely(userId));
    }

    private UserPlan createUserPlanSafely(String userId) {
        try {
            return userPlanRepository.save(UserPlan.builder()
                    .userId(userId)
                    .build());
        } catch (DuplicateKeyException e) {
            return userPlanRepository.findByUserId(userId)
                    .orElseThrow(() -> e);
        }
    }
}
