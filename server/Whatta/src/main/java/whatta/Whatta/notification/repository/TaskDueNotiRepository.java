package whatta.Whatta.notification.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.Update;
import org.springframework.stereotype.Repository;
import whatta.Whatta.notification.entity.TaskDueNotification;
import whatta.Whatta.notification.enums.NotiStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TaskDueNotiRepository extends MongoRepository<TaskDueNotification, String> {

    Optional<TaskDueNotification> findByTargetIdAndStatusAndTriggerAtAfter(String targetId, NotiStatus status, LocalDateTime now);

    Optional<TaskDueNotification> findByTargetIdAndStatus(String targetId, NotiStatus status);

    List<TaskDueNotification> findByStatusAndTriggerAtLessThanEqual(NotiStatus status, LocalDateTime now);

    Optional<TaskDueNotification> findByIdAndStatus(String id, NotiStatus status);

    @Query("{ 'status': ?0, 'updatedAt': { '$lt': ?1 } }")
    @Update("{ '$set': { 'status': ?2, 'updatedAt': ?3 } }")
    long updateStatusByStatusAndUpdatedAtBefore(NotiStatus currentStatus, LocalDateTime updatedAtBefore, NotiStatus nextStatus, LocalDateTime updatedAt);

    Long deleteByStatusAndUpdatedAtBefore(NotiStatus status, LocalDateTime expiredBefore);
}
