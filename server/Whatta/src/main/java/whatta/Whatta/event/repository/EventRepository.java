package whatta.Whatta.event.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.Update;
import whatta.Whatta.event.entity.Event;

import java.util.List;
import java.util.Optional;

public interface EventRepository extends MongoRepository<Event, String> {

    Optional<Event> findEventByIdAndUserId(String id, String userId);

    @Query("{ 'userId': ?0 }")
    @Update("{ '$pull': { 'labels': { '$in': ?1 } } }") //labels 배열에서 ?1에 있는 값들 전부 제거
    void pullLabelsByUserId(String userId, List<Long> labelIds);
}
