package whatta.Whatta.user.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import whatta.Whatta.user.entity.UserSetting;
import whatta.Whatta.user.payload.dto.ScheduleSummaryNotiSlim;

import java.util.List;
import java.util.Optional;

public interface UserSettingRepository extends MongoRepository<UserSetting, String> {
    Optional<UserSetting> findByUserId(String userId);

    @Query(
            value = "{'scheduleSummaryNoti.enabled': true}",
            fields = "{'userId':  1, 'scheduleSummaryNoti': 1}"
    )
    List<ScheduleSummaryNotiSlim> findByScheduleSummaryNotiEnabledTrue();

}
