package whatta.Whatta.notification.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.Update;
import org.springframework.stereotype.Repository;
import whatta.Whatta.notification.entity.ReminderNotification;
import whatta.Whatta.notification.enums.NotiStatus;
import whatta.Whatta.notification.enums.NotificationTargetType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReminderNotiRepository extends MongoRepository<ReminderNotification, String> {

    Optional<ReminderNotification>  findByTargetIdAndStatus(String targetId, NotiStatus status);

    Optional<ReminderNotification> findByTargetTypeAndTargetIdAndStatusAndTriggerAtAfter(NotificationTargetType targetType, String targetId, NotiStatus status, LocalDateTime now);

    List<ReminderNotification> findByStatusAndTriggerAtLessThanEqual(NotiStatus status, LocalDateTime now);

    List<ReminderNotification> findByStatusAndUserId(NotiStatus status, String userId);

    Optional<ReminderNotification> findByIdAndStatus(String id, NotiStatus status);

    @Query("{ 'status': ?0, 'updatedAt': { '$lt': ?1 } }")
    @Update("{ '$set': { 'status': ?2, 'updatedAt': ?3 } }")
    long updateStatusByStatusAndUpdatedAtBefore(NotiStatus currentStatus, LocalDateTime updatedAtBefore, NotiStatus nextStatus, LocalDateTime updatedAt);

    long deleteByStatusAndUpdatedAtBefore(NotiStatus status, LocalDateTime expiredBefore);
}
