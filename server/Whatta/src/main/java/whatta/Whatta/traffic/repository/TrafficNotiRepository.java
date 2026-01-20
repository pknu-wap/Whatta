package whatta.Whatta.traffic.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import whatta.Whatta.traffic.entity.TrafficNotification;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public interface TrafficNotiRepository extends MongoRepository<TrafficNotification, String> {

    List<TrafficNotification> findByUserId(String userId);

    Optional<TrafficNotification> findByIdAndUserId(String id, String userId);

    @Query("{ 'alarmTime': ?0, 'isEnabled': true, $or: [ { 'days': ?1 }, { 'isRepeatEnabled': false } ] }")
    List<TrafficNotification> findAlarmsToNotify(LocalTime alarmTime, DayOfWeek today);
}
