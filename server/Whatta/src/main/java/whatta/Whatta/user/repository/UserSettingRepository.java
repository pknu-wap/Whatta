package whatta.Whatta.user.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import whatta.Whatta.user.entity.UserSetting;

import java.util.Optional;

public interface UserSettingRepository extends MongoRepository<UserSetting, String> {
    Optional<UserSetting> findByUserId(String userId);
}
