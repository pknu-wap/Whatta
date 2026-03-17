package whatta.Whatta.user.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.Update;
import whatta.Whatta.user.entity.UserSetting;
import whatta.Whatta.user.payload.dto.ScheduleSummaryNotiSlim;

import java.util.List;
import java.util.Optional;

public interface UserSettingRepository extends MongoRepository<UserSetting, String> {
    Optional<UserSetting> findByUserId(String userId);

    List<UserSetting> findByScheduleSummaryNotiMinuteOfDayIsNullAndScheduleSummaryNotiTimeIsNotNull();

    List<ScheduleSummaryNotiSlim> findByScheduleSummaryNotiEnabledTrueAndScheduleSummaryNotiMinuteOfDay(int minuteOfDay);

    @Query("{ 'userId': ?0, 'scheduleSummaryNoti':  {'$ne':  null}}")
    @Update("{ '$set':  {'scheduleSummaryNoti.enabled':  false}}")
    void disableScheduleSummaryNotificationByUserId(String userId);

    @Query("{'_id':  ?0, 'scheduleSummaryNoti.minuteOfDay':  null, 'scheduleSummaryNoti.time': { '$ne': null }}")
    @Update("{'$set':  {'scheduleSummaryNoti.minuteOfDay':  ?1}}")
    long updateSummaryMinuteOfDayIfMissing(String id, int minuteOfDay);

}
