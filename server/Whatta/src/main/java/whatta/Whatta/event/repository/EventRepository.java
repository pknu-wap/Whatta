package whatta.Whatta.event.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import whatta.Whatta.event.entity.Event;

public interface EventRepository extends MongoRepository<Event, String> {
}
