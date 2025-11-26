package whatta.Whatta.traffic.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import whatta.Whatta.traffic.entity.BusItem;
import whatta.Whatta.traffic.entity.TrafficAlarm;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public interface TrafficAlarmRepository extends MongoRepository<TrafficAlarm, String> {

    List<TrafficAlarm> findByUserId(String userId);

    Optional<TrafficAlarm> findByIdAndUserId(String id, String userId);

    @Query("{ 'alarmTime': ?0, 'isEnabled': true, $or: [ { 'days': ?1 }, { 'isRepeatEnabled': false } ] }")
    List<TrafficAlarm> findAlarmsToNotify(LocalTime alarmTime, DayOfWeek today);
}
