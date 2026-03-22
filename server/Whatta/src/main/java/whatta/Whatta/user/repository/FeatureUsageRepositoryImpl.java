package whatta.Whatta.user.repository;

import com.mongodb.client.result.UpdateResult;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Repository;
import whatta.Whatta.user.entity.FeatureUsage;
import whatta.Whatta.user.enums.FeatureType;

import java.time.LocalDate;

@Repository
@RequiredArgsConstructor
public class FeatureUsageRepositoryImpl implements FeatureUsageRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    @Override
    public boolean incrementTodayUsage(String userId, FeatureType featureType, LocalDate today) {
        Query query = new Query(new Criteria().andOperator(
                Criteria.where("userId").is(userId),
                Criteria.where("featureType").is(featureType),
                Criteria.where("usageDate").is(today)
        ));
        Update update = new Update().inc("usedCount", 1);
        UpdateResult result = mongoTemplate.updateFirst(query, update, FeatureUsage.class);
        return result.getModifiedCount() > 0;
    }

    @Override
    public void resetOrCreateUsage(String userId, FeatureType featureType, LocalDate today) {
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

        try {
            mongoTemplate.upsert(query, update, FeatureUsage.class);
        } catch (DuplicateKeyException e) {
            incrementTodayUsage(userId, featureType, today);
        }
    }
}
