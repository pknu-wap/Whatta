package whatta.Whatta.notification.service;

import jakarta.annotation.PostConstruct;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import whatta.Whatta.user.entity.UserSetting;
import whatta.Whatta.user.payload.dto.ScheduleSummaryNotiSlim;
import whatta.Whatta.user.repository.UserSettingRepository;

import java.time.LocalTime;
import java.util.List;

@Service
@Slf4j
@AllArgsConstructor
public class SummaryNotiService {

    private final UserSettingRepository userSettingRepository;

    @PostConstruct
    void backfillSummaryMinuteOfDay() {
        List<UserSetting> legacySettings = userSettingRepository.findByScheduleSummaryNotiMinuteOfDayIsNullAndScheduleSummaryNotiTimeIsNotNull();
        if (legacySettings.isEmpty()) {
            return;
        }

        List<UserSetting> toUpdate = legacySettings.stream()
                .filter(setting -> setting.getScheduleSummaryNoti() != null)
                .filter(setting -> setting.getScheduleSummaryNoti().getTime() != null)
                .map(setting -> setting.toBuilder()
                        .scheduleSummaryNoti(setting.getScheduleSummaryNoti().toBuilder()
                                .minuteOfDay(toMinuteOfDay(setting.getScheduleSummaryNoti().getTime()))
                                .build())
                        .build())
                .toList();

        if (toUpdate.isEmpty()) {
            return;
        }

        userSettingRepository.saveAll(toUpdate);
        log.info("Summary minuteOfDay backfill completed. updated={}", toUpdate.size());
    }

    public List<ScheduleSummaryNotiSlim> getActiveSummaryToSend(LocalTime localTime) {
        return userSettingRepository.findByScheduleSummaryNotiEnabledTrueAndScheduleSummaryNotiMinuteOfDay(
                toMinuteOfDay(localTime)
        );
    }

    private int toMinuteOfDay(LocalTime time) {
        return time.getHour() * 60 + time.getMinute();
    }

    public void disableSummary (ScheduleSummaryNotiSlim notiSlim) {
        userSettingRepository.disableScheduleSummaryNotificationByUserId(notiSlim.getUserId());
    }
}
