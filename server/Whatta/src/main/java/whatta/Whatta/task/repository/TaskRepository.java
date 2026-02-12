package whatta.Whatta.task.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.Update;
import whatta.Whatta.task.entity.Task;

import java.util.List;
import java.util.Optional;

public interface TaskRepository extends MongoRepository<Task, String> {


    List<Task> findByUserId(String userId);

    Optional<Task> findByIdAndUserId(String id, String userId);

    boolean existsByIdAndUserId(String id, String userId);

    Optional<Task> findTopByUserIdOrderBySortNumberAsc(String userId);

    List<Task> findByUserIdAndPlacementDateIsNullOrderBySortNumberAsc(String userId);

    @Query("{ 'userId': ?0 }")
    @Update("{ '$pull': { 'labels': { '$in': ?1 } } }") //labels 배열에서 ?1에 있는 값들 전부 제거
    void pullLabelsByUserId(String userId, List<Long> labelIds);

    List<Task> findByUserIdOrderBySortNumberAsc(String userId);
}