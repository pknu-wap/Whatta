package whatta.Whatta.notification.service.processor;


import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.calendar.payload.response.DailyResponse;
import whatta.Whatta.calendar.service.CalendarViewService;
import whatta.Whatta.global.util.LocalDateTimeUtil;
import whatta.Whatta.notification.service.NotificationSendService;
import whatta.Whatta.user.enums.NotifyDay;
import whatta.Whatta.user.payload.dto.ScheduleSummaryNotiSlim;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
@AllArgsConstructor
public class SummaryNotiProcessor {

    private final CalendarViewService calendarViewService;
    private final NotificationSendService notificationSendService;

    public boolean processSummary(ScheduleSummaryNotiSlim notiSlim, LocalDateTime nowUser) {
        LocalDate targetDate = resolveTargetDate(nowUser.toLocalDate(), notiSlim.getScheduleSummaryNoti().getNotifyDay());

        DailyResponse daily = calendarViewService.getDaily(notiSlim.getUserId(), targetDate);


        int eventCount =
                daily.allDaySpanEvents().size()
                        + daily.allDayEvents().size()
                        + daily.timedEvents().size();

        int taskCount =
                daily.allDayTasks().size()
                        + daily.timedTasks().size();

        String title = buildTitle(targetDate, eventCount, taskCount);
        String body = buildBody(targetDate, daily, eventCount, taskCount);

        return notificationSendService.sendSummary(
                notiSlim.getUserId(),
                title,
                body
        );
    }

    private LocalDate resolveTargetDate(LocalDate today, NotifyDay notifyDay) {
        return switch (notifyDay) {
            case TODAY -> today;
            case TOMORROW -> today.plusDays(1); //내일 일정들을 오늘 보낸다
        };
    }

    private String buildTitle(LocalDate date, int eventCount, int taskCount) {
        //예: 11월 20일 일정
        String title = String.format("%d월 %d일", date.getMonthValue(), date.getDayOfMonth());
        return String.format(
                "%s 일정",
                title
        );
    }

    private String buildBody(LocalDate targetDate,
                             DailyResponse daily,
                             int eventCount,
                             int taskCount) {
        StringBuilder sb = new StringBuilder();

        // ---- 시간지정 있는 일정 + task만 사용 ---- //

        //시간지정 있는 일정
        var timedEvents = new ArrayList<>(daily.timedEvents());

        //시간지정 task
        var timedTask = new ArrayList<>(daily.timedTasks());
        //시간지정 없는 task
        var allDayTask = new ArrayList<>(daily.allDayTasks());

        List<String> previewLines = new ArrayList<>();

        //1) 시간 있는 일정에서 최대 3개까지 채우기
        for (int i = 0; i < Math.min(3, timedEvents.size()); i++) {
            var e = timedEvents.get(i);
            previewLines.add(String.format("\u200B -  %s %s", formatTime(e.clippedStartTime()), e.title()));
        }

        //2) 남은 칸 시간지정 task로 채우기 (총 4개까지)
        int remainingTimed = 4 - previewLines.size();
        for (int i = 0; i < Math.min(remainingTimed, timedTask.size()); i++) {
            var t = timedTask.get(i);
            previewLines.add(String.format("☑ %s %s", formatTime(t.placementTime()), t.title()));
        }

        //3) 남은 칸 시간지정 없는 task로 채우기 (총 4개까지)
        int remaining = 4 - previewLines.size();
        for (int i = 0; i < Math.min(remaining, allDayTask.size()); i++) {
            var t = allDayTask.get(i);
            previewLines.add(String.format("☑ %s ", t.title()));
        }

        // 3) previewLines 출력
        previewLines.forEach(line -> sb.append(line).append("\n"));

        return sb.toString().trim();
    }

    private String formatTime(LocalTime time) {
        if (time == null) {
            return "";
        }
        return String.format("%02d:%02d", time.getHour(), time.getMinute());
    }

    private String formatTime(String timeStr) {
        if (timeStr == null || timeStr.isBlank()) {
            return "";
        }
        LocalTime time = LocalDateTimeUtil.stringToLocalTime(timeStr);
        return formatTime(time);
    }
}
