package whatta.Whatta.event.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import whatta.Whatta.event.entity.Event;

import java.util.Optional;

public interface EventRepository extends MongoRepository<Event, String> {

    Optional<Event> findEventByIdAndUserId(String id, String userId);
}
