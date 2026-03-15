package whatta.Whatta.notification.scheduler;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import whatta.Whatta.notification.service.SummaryNotiService;
import whatta.Whatta.notification.service.processor.SummaryNotiProcessor;
import whatta.Whatta.user.payload.dto.ScheduleSummaryNotiSlim;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@AllArgsConstructor
public class SummaryNotiScheduler {

    private final SummaryNotiService summaryNotiService;
    private final SummaryNotiProcessor summaryNotiProcessor;

    //매분마다 요약알림 보낼 시각인지 체크
    @Scheduled(cron = "0 * * * * *") //1분마다
    public void processDailySummary() {
        LocalDateTime now = LocalDateTime.now();

        List<ScheduleSummaryNotiSlim> notis = summaryNotiService.getActiveSummaryToSend(now.toLocalTime());
        for (ScheduleSummaryNotiSlim notiSlim  : notis) {
            if (notiSlim.getScheduleSummaryNoti() == null) {
                continue;
            }

            try {
                boolean sent = summaryNotiProcessor.processSummary(notiSlim, now);
                if (!sent) {
                    summaryNotiService.disableSummary(notiSlim);
                    log.info("[SUMMARY] Failed to send summary for userId={}", notiSlim.getUserId());
                }
            } catch (Exception e) {
                log.error("[SUMMARY] Failed to send summary for userId={}", notiSlim.getUserId(), e);
            }
        }
    }
}
