package whatta.Whatta.user.plan.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import whatta.Whatta.user.plan.entity.UserPlan;

import java.util.Optional;

public interface UserPlanRepository extends MongoRepository<UserPlan, String> {
    Optional<UserPlan> findByUserId(String userId);
}
