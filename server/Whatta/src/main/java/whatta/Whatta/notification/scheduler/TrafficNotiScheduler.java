package whatta.Whatta.notification.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import whatta.Whatta.notification.service.processor.BusNotiProcessor;
import whatta.Whatta.traffic.entity.TrafficNotification;
import whatta.Whatta.traffic.repository.TrafficNotiRepository;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class TrafficNotiScheduler {

    private final TrafficNotiRepository alarmRepository;
    private final BusNotiProcessor notificationService;

    //매분 0초마다 조건 체크
    @Scheduled(cron = "0 * * * * *")
    public void checkTrafficAlarms(){
        ZoneId zone = ZoneId.of("Asia/Seoul");
        LocalTime now = LocalTime.now(zone).truncatedTo(ChronoUnit.MINUTES);
        DayOfWeek today = LocalDate.now(zone).getDayOfWeek();
        int minuteOfDay = now.getHour() * 60 + now.getMinute();

        //지정된 시간과 날짜에 켜져있는 알림만 DB에서 조회
        List<TrafficNotification> targets = alarmRepository.findAlarmsToNotify(
                minuteOfDay,
                today
        );

        if (targets.isEmpty()) {
            log.debug("해당 시간에 울릴 교통 알림 없음.");
            return;
        }
        targets.forEach(notificationService::checkAndNotify);
    }
}
