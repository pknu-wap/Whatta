package whatta.Whatta.notification.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import whatta.Whatta.notification.entity.FcmToken;

@Repository
public interface FcmTokenRepository extends MongoRepository<FcmToken, String> {

    void deleteByUserId(String userId);

    FcmToken findByUserId(String userId);

}
