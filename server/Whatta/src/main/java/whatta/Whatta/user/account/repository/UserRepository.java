package whatta.Whatta.user.account.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import whatta.Whatta.user.account.entity.User;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByInstallationId(String installationId);
    Optional<User> findUserById(String Id);
}
