package whatta.Whatta.traffic.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import whatta.Whatta.traffic.entity.TrafficNotification;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Optional;

public interface TrafficNotiRepository extends MongoRepository<TrafficNotification, String> {

    List<TrafficNotification> findByUserId(String userId);

    Optional<TrafficNotification> findByIdAndUserId(String id, String userId);

    @Query("{ 'isEnabled': true, " +
            "$or: [ { 'days': ?2 }, { 'isRepeatEnabled': false } ], " +
            "$expr: { $and: [ " +
            "{ $eq: [ { $hour: { date: '$alarmTime', timezone: 'Asia/Seoul' } }, ?0 ] }, " +
            "{ $eq: [ { $minute: { date: '$alarmTime', timezone: 'Asia/Seoul' } }, ?1 ] } " +
            "] } }")
    List<TrafficNotification> findAlarmsToNotify(int hour, int minute, DayOfWeek today);
}
