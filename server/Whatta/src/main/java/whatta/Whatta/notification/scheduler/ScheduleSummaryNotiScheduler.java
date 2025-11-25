package whatta.Whatta.notification.scheduler;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import whatta.Whatta.notification.service.ScheduleSummaryNotiService;
import whatta.Whatta.user.entity.ScheduleSummaryNoti;
import whatta.Whatta.user.payload.dto.ScheduleSummaryNotiSlim;
import whatta.Whatta.user.repository.UserSettingRepository;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Slf4j
@Component
@AllArgsConstructor
public class ScheduleSummaryNotiScheduler {

    private final UserSettingRepository userSettingRepository;
    private final ScheduleSummaryNotiService scheduleSummaryNotiService;

    //매분마다 요약알림 보낼 시각인지 체크
    @Scheduled(cron = "0 * * * * *") //1분마다
    public void processDailySummary() {

        List<ScheduleSummaryNotiSlim> notis = userSettingRepository.findByScheduleSummaryNotiEnabledTrue();

        for (ScheduleSummaryNotiSlim notiSlim  : notis) {
            ScheduleSummaryNoti noti = notiSlim.getScheduleSummaryNoti();
            if (noti == null || !noti.isEnabled()) {
                continue;
            }

            LocalDateTime nowUser = LocalDateTime.now();

            //보내야 할 시각인지 확인
            if (!isTimeToSend(nowUser.toLocalTime(), noti.getTime())) {
                continue;
            }

            try {
                scheduleSummaryNotiService.sendSummary(notiSlim, nowUser);
            } catch (Exception e) {
                log.error("[SUMMARY] Failed to send summary for userId={}", notiSlim.getUserId(), e);
            }
        }
    }

    private boolean isTimeToSend(LocalTime now, LocalTime target) {
        return now.getHour() == target.getHour()
                && now.getMinute() == target.getMinute();
    }
}
