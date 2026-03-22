package whatta.Whatta.user.plan.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Repository;
import whatta.Whatta.user.plan.entity.FeatureUsage;
import whatta.Whatta.user.plan.enums.FeatureType;

import java.time.LocalDate;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class FeatureUsageRepositoryImpl implements FeatureUsageRepositoryCustom {

    private static final int MAX_RETRY_COUNT = 3;

    private final MongoTemplate mongoTemplate;

    @Override
    public Optional<FeatureUsage> increaseUsageIfAvailable(String userId, FeatureType featureType, LocalDate today, int dailyLimit) {
        for (int attempt = 0; attempt < MAX_RETRY_COUNT; attempt++) {
            FeatureUsage incrementedUsage = tryIncrementTodayUsage(userId, featureType, today, dailyLimit);
            if (incrementedUsage != null) {
                return Optional.of(incrementedUsage);
            }

            FeatureUsage currentUsage = findCurrentUsage(userId, featureType);
            if (currentUsage != null) {
                if (today.equals(currentUsage.getUsageDate()) && currentUsage.getUsedCount() >= dailyLimit) {
                    return Optional.empty();
                }
                if (today.equals(currentUsage.getUsageDate())) {
                    continue;
                }
            }

            try {
                FeatureUsage resetOrCreatedUsage = resetOrCreateUsage(userId, featureType, today);
                if (resetOrCreatedUsage != null) {
                    return Optional.of(resetOrCreatedUsage);
                }
            } catch (DuplicateKeyException e) {
                // Another request created or refreshed today's usage first. Retry with the latest document state.
            }
        }

        FeatureUsage latestUsage = findCurrentUsage(userId, featureType);
        if (latestUsage != null && today.equals(latestUsage.getUsageDate()) && latestUsage.getUsedCount() >= dailyLimit) {
            return Optional.empty();
        }
        return Optional.empty();
    }

    private FeatureUsage tryIncrementTodayUsage(String userId, FeatureType featureType, LocalDate today, int dailyLimit) {
        Query query = new Query(new Criteria().andOperator(
                Criteria.where("userId").is(userId),
                Criteria.where("featureType").is(featureType),
                Criteria.where("usageDate").is(today),
                Criteria.where("usedCount").lt(dailyLimit)
        ));
        Update update = new Update().inc("usedCount", 1);
        return mongoTemplate.findAndModify(
                query,
                update,
                FindAndModifyOptions.options().returnNew(true),
                FeatureUsage.class
        );
    }

    private FeatureUsage resetOrCreateUsage(String userId, FeatureType featureType, LocalDate today) {
        Query query = new Query(new Criteria().andOperator(
                Criteria.where("userId").is(userId),
                Criteria.where("featureType").is(featureType),
                new Criteria().orOperator(
                        Criteria.where("usageDate").ne(today),
                        Criteria.where("usageDate").exists(false)
                )
        ));
        Update update = new Update()
                .setOnInsert("userId", userId)
                .setOnInsert("featureType", featureType)
                .set("usageDate", today)
                .set("usedCount", 1);

        return mongoTemplate.findAndModify(
                query,
                update,
                FindAndModifyOptions.options().upsert(true).returnNew(true),
                FeatureUsage.class
        );
    }

    private FeatureUsage findCurrentUsage(String userId, FeatureType featureType) {
        Query query = new Query(new Criteria().andOperator(
                Criteria.where("userId").is(userId),
                Criteria.where("featureType").is(featureType)
        ));
        return mongoTemplate.findOne(query, FeatureUsage.class);
    }
}
