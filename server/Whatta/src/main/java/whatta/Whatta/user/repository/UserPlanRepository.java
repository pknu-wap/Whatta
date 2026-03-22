package whatta.Whatta.user.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import whatta.Whatta.user.entity.UserPlan;

import java.util.Optional;

public interface UserPlanRepository extends MongoRepository<UserPlan, String> {
    Optional<UserPlan> findByUserId(String userId);
}
