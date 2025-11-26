package whatta.Whatta.notification.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import whatta.Whatta.notification.service.TrafficAlarmNotificationService;
import whatta.Whatta.traffic.entity.TrafficAlarm;
import whatta.Whatta.traffic.repository.TrafficAlarmRepository;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class TrafficAlarmScheduler {

    private final TrafficAlarmRepository alarmRepository;
    private final TrafficAlarmNotificationService notificationService;

    //매분 0초마다 조건 체크
    @Scheduled(cron = "0 * * * * *")
    public void checkTrafficAlarms(){

        LocalTime now = LocalTime.now().truncatedTo(ChronoUnit.MINUTES);
        DayOfWeek today = LocalDate.now().getDayOfWeek();

        //지정된 시간과 날짜에 켜져있는 알림만 DB에서 조회
        List<TrafficAlarm> targets = alarmRepository.findAlarmsToNotify(now, today);

        if (targets.isEmpty()) {
            log.debug("해당 시간에 울릴 교통 알림 없음.");
            return;
        }
        //각 알림에 대해 도착 정보 확인 및 알림 발송
        targets.forEach(this::processAlarm);
    }

    @Async
    private void processAlarm(TrafficAlarm alarm) {
        notificationService.CheckAndNotify(alarm);
    }
}
