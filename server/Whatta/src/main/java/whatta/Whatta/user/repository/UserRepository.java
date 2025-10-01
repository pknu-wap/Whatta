package whatta.Whatta.user.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import whatta.Whatta.user.entity.User;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByInstallationId(String installationId);
}
