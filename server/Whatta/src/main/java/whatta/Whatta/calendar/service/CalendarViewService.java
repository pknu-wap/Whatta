package whatta.Whatta.calendar.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.calendar.mapper.CalendarMapper;
import whatta.Whatta.calendar.payload.dto.*;
import whatta.Whatta.calendar.payload.response.MonthlyResponse;
import whatta.Whatta.calendar.repository.dto.*;
import whatta.Whatta.calendar.payload.response.DailyResponse;
import whatta.Whatta.calendar.payload.response.WeeklyResponse;
import whatta.Whatta.calendar.repository.CalendarEventsRepositoryCustom;
import whatta.Whatta.calendar.repository.CalendarTasksRepositoryCustom;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.global.label.payload.LabelItem;
import whatta.Whatta.global.repeat.Repeat;
import whatta.Whatta.global.util.LabelUtil;
import whatta.Whatta.user.entity.UserSetting;
import whatta.Whatta.user.repository.UserSettingRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

import static whatta.Whatta.global.util.RepeatUtil.findNextOccurrenceStartAfter;

@Service
@AllArgsConstructor
public class CalendarViewService {

    private final CalendarEventsRepositoryCustom calendarEventsRepository;
    private final CalendarTasksRepositoryCustom calendarTasksRepository;
    private final Executor calendarExecutor;
    private final CalendarMapper calendarMapper;
    private final UserSettingRepository userSettingRepository;


    public DailyResponse getDaily(String userId, LocalDate date) {

        //db 조회를 병렬로
        CompletableFuture<CalendarEventsResult> eventsFuture =
                CompletableFuture.supplyAsync(() -> calendarEventsRepository.getDailyViewByUserId(userId,date), calendarExecutor);
        CompletableFuture<CalendarTasksResult> tasksFuture =
                CompletableFuture.supplyAsync(() -> calendarTasksRepository.getDailyViewByUserId(userId, date), calendarExecutor);

        //두 조회가 끝난 후 조립
        CalendarEventsResult eventsResult = eventsFuture.join();
        CalendarTasksResult tasksResult = tasksFuture.join();

        //라벨 리스트
        List<LabelItem> labelPalette = buildLabelPalette(userId, eventsResult, tasksResult);

        List<AllDaySpanEvent> spanEvents = new ArrayList<>(); //시간지정 없는 기간 event
        List<AllDayEvent> allDayEvents = new ArrayList<>(); //시간지정 없고 기간도 없는 event

        //시간지정 없는 event ---------------------------------------------------------------
        for(CalendarAllDayEventItem event : eventsResult.allDayEvents()) {
            if (event.repeat() != null) {
                List<LocalDate> instanceDates = expandRepeatDates(
                        LocalDateTime.of(event.startDate(), LocalTime.MIDNIGHT),
                        event.repeat(),
                        date, date
                );

                long span = ChronoUnit.DAYS.between(event.startDate(), event.endDate()); //원본 span 길이

                for (LocalDate instanceDate : instanceDates) {
                    LocalDate newEndDate = instanceDate.plusDays(span);

                    CalendarAllDayEventItem instance = CalendarAllDayEventItem.builder()
                            .id(event.id())
                            .title(event.title())
                            .colorKey(event.colorKey())
                            .labels(event.labels())
                            .isSpan(event.isSpan())
                            .startDate(instanceDate)
                            .endDate(newEndDate)
                            .repeat(event.repeat())
                            .build();

                    if (instance.isSpan()) {
                        spanEvents.add(calendarMapper.allDayEventItemToSpanResponse(instance));
                    } else {
                        allDayEvents.add(calendarMapper.allDayEventItemToResponse(instance));
                    }
                }
                continue;
            }

            if (event.isSpan()) {
                spanEvents.add(calendarMapper.allDayEventItemToSpanResponse(event));
            }
            else {  //시간지정 없고 기간도 없는 event
                allDayEvents.add(calendarMapper.allDayEventItemToResponse(event));
            }
        }

        //시간지정 없는 task ----------------------------------------------------------------
        List<AllDayTask> allDayTasks = new ArrayList<>();
        for(CalendarAllDayTaskItem task : tasksResult.allDayTasks()) {
            allDayTasks.add(calendarMapper.allDayTaskItemToResponse(task));
        }

        //시간지정 있는 event -> 해당 날짜에 알맞게 클리핑 -----------------------------------------
        List<TimedEvent> timedEvents = new ArrayList<>();
        for(CalendarTimedEventItem event : eventsResult.timedEvents() ) {
            if (event.repeat() != null) {
                List<LocalDate> instanceDates = expandRepeatDates(
                        LocalDateTime.of(event.startDate(), event.startTime()),
                        event.repeat(),
                        date, date
                );

                long span = ChronoUnit.DAYS.between(event.startDate(), event.endDate()); //원본 span 길이

                for (LocalDate instanceDate : instanceDates) {
                    LocalDate newEndDate = instanceDate.plusDays(span);

                    CalendarTimedEventItem instance = CalendarTimedEventItem.builder()
                            .id(event.id())
                            .title(event.title())
                            .colorKey(event.colorKey())
                            .labels(event.labels())
                            .isSpan(event.isSpan())
                            .startDate(instanceDate)
                            .endDate(newEndDate)
                            .startTime(event.startTime())
                            .endTime(event.endTime())
                            .repeat(event.repeat())
                            .build();

                    LocalTime clippedStartTime = date.equals(instance.startDate()) ? event.startTime() : LocalTime.MIN;
                    LocalTime clippedEndTime = date.equals(instance.endDate()) ? event.endTime() : LocalTime.MAX;

                    timedEvents.add(calendarMapper.timedEventItemToResponse(instance, clippedStartTime, clippedEndTime));
                }
                continue;
            }

            LocalTime clippedStartTime = date.equals(event.startDate()) ? event.startTime() : LocalTime.MIN; //date가 기간의 첫날이 아니면 -> 0시부터
            LocalTime clippedEndTime = date.equals(event.endDate()) ? event.endTime() : LocalTime.MAX; //date가 기간의 마지막 날이 아니면 -> 24시로 끊음

            timedEvents.add(calendarMapper.timedEventItemToResponse(event, clippedStartTime, clippedEndTime));
        }

        //시간지정 있는 task ----------------------------------------------------------------
        List<TimedTask> timedTasks = new ArrayList<>();
        for(CalendarTimedTaskItem task : tasksResult.timedTasks()) {
            timedTasks.add(calendarMapper.timedTaskItemToResponse(task));
        }

        return DailyResponse.builder()
                .labelPalette(labelPalette)
                .allDaySpanEvents(spanEvents)
                .allDayEvents(allDayEvents)
                .allDayTasks(allDayTasks)
                .timedEvents(timedEvents)
                .timedTasks(timedTasks)
                .build();
    }

    public WeeklyResponse getWeekly(String userId, LocalDate start, LocalDate end) {

        //날짜 리스트
        List<LocalDate> datesInRange = buildDateRange(start, end);

        //db 조회를 병렬로
        CompletableFuture<CalendarEventsResult> eventsFuture =
                CompletableFuture.supplyAsync(() -> calendarEventsRepository.getWeeklyViewByUserId(userId, start, end), calendarExecutor);
        CompletableFuture<CalendarTasksResult> tasksFuture =
                CompletableFuture.supplyAsync(() -> calendarTasksRepository.getWeeklyViewByUserId(userId, start, end), calendarExecutor);

        //두 조회가 끝난 후 조립
        CalendarEventsResult eventsResult = eventsFuture.join();
        CalendarTasksResult tasksResult = tasksFuture.join();

        //라벨 리스트
        List<LabelItem> labelPalette = buildLabelPalette(userId, eventsResult,tasksResult);

        Map<LocalDate, List<AllDayEvent>> allDayEventsByDate = new HashMap<>();
        Map<LocalDate, List<AllDayTask>>  allDayTasksByDate  = new HashMap<>();
        Map<LocalDate, List<TimedEvent>>  timedEventsByDate  = new HashMap<>();
        Map<LocalDate, List<TimedTask>>   timedTasksByDate   = new HashMap<>();

        for(LocalDate date : datesInRange) {
            allDayEventsByDate.put(date, new ArrayList<>());
            allDayTasksByDate.put(date,  new ArrayList<>());
            timedEventsByDate.put(date,  new ArrayList<>());
            timedTasksByDate.put(date,   new ArrayList<>());
        }

        //시간지정 없는 기간 event ------------------------------------------------------------
        List<AllDaySpanEvent> spanEvents = new ArrayList<>();
        for(CalendarAllDayEventItem event : eventsResult.allDayEvents()) {
            if (event.repeat() != null) {
                List<LocalDate> instanceDates = expandRepeatDates(
                        LocalDateTime.of(event.startDate(), LocalTime.MIDNIGHT),
                        event.repeat(),
                        start, end);

                long span = ChronoUnit.DAYS.between(event.startDate(), event.endDate()); //원본 span 길이

                for (LocalDate instanceDate : instanceDates) {
                    LocalDate newEndDate = instanceDate.plusDays(span);

                    CalendarAllDayEventItem instance = CalendarAllDayEventItem.builder()
                            .id(event.id())
                            .title(event.title())
                            .colorKey(event.colorKey())
                            .labels(event.labels())
                            .isSpan(event.isSpan())
                            .startDate(instanceDate)
                            .endDate(newEndDate)
                            .repeat(event.repeat())
                            .build();

                    if (event.isSpan()) {
                        spanEvents.add(calendarMapper.allDayEventItemToSpanResponse(instance));
                    }
                    else {  //시간지정 없고 기간도 없는 event
                        allDayEventsByDate.get(instance.startDate()).add(calendarMapper.allDayEventItemToResponse(instance));
                    }
                }
                continue;
            }

            if (event.isSpan()) {
                spanEvents.add(calendarMapper.allDayEventItemToSpanResponse(event));
            }
            else {  //시간지정 없고 기간도 없는 event
                allDayEventsByDate.get(event.startDate()).add(calendarMapper.allDayEventItemToResponse(event));
            }
        }

        //시간지정 없는 task -----------------------------------------------------------------
        for(CalendarAllDayTaskItem task : tasksResult.allDayTasks()) {
            allDayTasksByDate.get(task.placementDate()).add(calendarMapper.allDayTaskItemToResponse(task));
        }

        //시간지정 있는 event -> 기간 내에서 날짜별 클리핑 ------------------------------------------
        for(CalendarTimedEventItem event : eventsResult.timedEvents() ) {
            if (event.repeat() != null) {
                List<LocalDate> instanceDates = expandRepeatDates(
                        LocalDateTime.of(event.startDate(), event.startTime()),
                        event.repeat(),
                        start, end
                );

                long span = ChronoUnit.DAYS.between(event.startDate(), event.endDate()); //원본 span 길이

                for (LocalDate instanceDate : instanceDates) {
                    LocalDate clipStartDate = instanceDate.isBefore(start) ? start : instanceDate;
                    LocalDate clipEndDate = instanceDate.plusDays(span).isAfter(end) ? end : instanceDate.plusDays(span);


                    CalendarTimedEventItem instance = CalendarTimedEventItem.builder()
                            .id(event.id())
                            .title(event.title())
                            .colorKey(event.colorKey())
                            .labels(event.labels())
                            .isSpan(event.isSpan())
                            .startDate(clipStartDate)
                            .endDate(clipEndDate)
                            .startTime(event.startTime())
                            .endTime(event.endTime())
                            .repeat(event.repeat())
                            .build();

                    for(LocalDate date = clipStartDate; !date.isAfter(clipEndDate); date = date.plusDays(1)) {
                        LocalTime clippedStartTime = date.equals(instance.startDate()) ? instance.startTime() : LocalTime.MIN;
                        LocalTime clippedEndTime = date.equals(instance.endDate()) ? instance.endTime() : LocalTime.MAX;

                        timedEventsByDate.get(date)
                                .add(calendarMapper.timedEventItemToResponse(instance, clippedStartTime, clippedEndTime));
                    }
                }
                continue;
            }

            LocalDate clipStartDate = event.startDate().isBefore(start) ? start : event.startDate();
            LocalDate clipEndDate = event.endDate().isAfter(end) ? end : event.endDate();

            for(LocalDate date = clipStartDate; !date.isAfter(clipEndDate); date = date.plusDays(1)) {
                LocalTime clippedStartTime = date.equals(event.startDate()) ? event.startTime() : LocalTime.MIN; //date가 기간의 첫날이 아니면 -> 0시부터
                LocalTime clippedEndTime = date.equals(event.endDate()) ? event.endTime() : LocalTime.MAX; //date가 기간의 마지막 날이 아니면 -> 24시로 끊음

                timedEventsByDate.get(date)
                        .add(calendarMapper.timedEventItemToResponse(event, clippedStartTime, clippedEndTime));
            }
        }

        //시간지정 있는 task ------------------------------------------------------------------
        for(CalendarTimedTaskItem task : tasksResult.timedTasks()) {
            timedTasksByDate.get(task.placementDate()).add(calendarMapper.timedTaskItemToResponse(task));
        }

        List<DayOfWeek> days = new ArrayList<>();
        for(LocalDate date : datesInRange) {
            days.add(DayOfWeek.builder()
                            .date(date)
                            .allDayEvents(allDayEventsByDate.get(date))
                            .allDayTasks(allDayTasksByDate.get(date))
                            .timedEvents(timedEventsByDate.get(date))
                            .timedTasks(timedTasksByDate.get(date))
                    .build());
        }

        return WeeklyResponse.builder()
                .labelPalette(labelPalette)
                .allDaySpanEvents(spanEvents)
                .days(days)
                .build();
    }

    private List<LabelItem> buildLabelPalette(String userId, CalendarEventsResult eventsResult, CalendarTasksResult tasksResult) {
        Set<Long> labelIds = new HashSet<>();
        if(eventsResult != null) {
            //allDayEvent
            for(CalendarAllDayEventItem item : eventsResult.allDayEvents()) {
                if(item.labels() != null && !item.labels().isEmpty()) {
                    labelIds.addAll(item.labels());
                }}

            //timedEvent
            for(CalendarTimedEventItem item : eventsResult.timedEvents()) {
                if(item.labels() != null && !item.labels().isEmpty()) {
                    labelIds.addAll(item.labels());
                }}
        }

        if(tasksResult != null) {
            //allDayTask
            for(CalendarAllDayTaskItem item : tasksResult.allDayTasks()) {
                if(item.labels() != null && !item.labels().isEmpty()) {
                    labelIds.addAll(item.labels());
                }}

            //timedTask
            for(CalendarTimedTaskItem item : tasksResult.timedTasks()) {
                if(item.labels() != null && !item.labels().isEmpty()) {
                    labelIds.addAll(item.labels());
                }}
        }

        if(labelIds.isEmpty())
            return List.of();


        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        return LabelUtil.getTitleAndColorKeyByIdsForResponse(userSetting, new ArrayList<>(labelIds));
    }

    public MonthlyResponse getMonthly(String userId, YearMonth month) {

        LocalDate start = month.atDay(1);
        LocalDate end = month.atEndOfMonth();

        List<LocalDate> datesInRange = buildDateRange(start, end);

        //db 조회를 병렬로
        CompletableFuture<List<CalendarMonthlyEventResult>> eventsFuture =
                CompletableFuture.supplyAsync(() -> calendarEventsRepository.getMonthlyViewByUserId(userId, start, end), calendarExecutor);
        CompletableFuture<List<CalendarMonthlyTaskResult>> tasksFuture =
                CompletableFuture.supplyAsync(() -> calendarTasksRepository.getMonthlyViewByUserId(userId, start, end), calendarExecutor);

        //두 조회가 끝난 후 조립
        List<CalendarMonthlyEventResult> eventsResult = eventsFuture.join();
        List<CalendarMonthlyTaskResult> tasksResult = tasksFuture.join();

        //라벨 리스트
        List<LabelItem> labelPalette = buildMonthlyLabelPalette(userId, eventsResult, tasksResult);

        Map<LocalDate, List<MonthEvent>> eventByDate = new HashMap<>();
        Map<LocalDate, List<MonthTask>> taskByDate = new HashMap<>();
        for(LocalDate date : datesInRange) {
            eventByDate.put(date, new ArrayList<>());
            taskByDate.put(date, new ArrayList<>());
        }

        //기간 event
        List<MonthSpanEvent> spanEvents = new ArrayList<>();
        for(CalendarMonthlyEventResult event : eventsResult) {
            if (event.repeat() != null) {
                List<LocalDate> instanceDates = expandRepeatDates(
                        LocalDateTime.of(event.startDate(), event.startTime()),
                        event.repeat(),
                        start, end);

                long span = ChronoUnit.DAYS.between(event.startDate(), event.endDate()); //원본 span 길이

                for (LocalDate instanceDate : instanceDates) {
                    LocalDate newEndDate = instanceDate.plusDays(span);

                    CalendarMonthlyEventResult instance = CalendarMonthlyEventResult.builder()
                            .id(event.id())
                            .title(event.title())
                            .colorKey(event.colorKey())
                            .labels(event.labels())
                            .isSpan(event.isSpan())
                            .startDate(instanceDate)
                            .endDate(newEndDate)
                            .startTime(event.startTime())
                            .endTime(event.endTime())
                            .isRepeat(true)
                            .repeat(event.repeat())
                            .build();

                    if (event.isSpan()) {
                        spanEvents.add(calendarMapper.MonthlyEventResultToSpanResponse(instance));
                    }
                    else {
                        eventByDate.get(instance.startDate()).add(calendarMapper.MonthlyEventResultToResponse(instance));
                    }
                }
                continue;
            }
            if (event.isSpan()) {
                spanEvents.add(calendarMapper.MonthlyEventResultToSpanResponse(event));
            }
            else {
                eventByDate.get(event.startDate()).add(calendarMapper.MonthlyEventResultToResponse(event));
            }
        }

        //task
        for(CalendarMonthlyTaskResult task : tasksResult) {
            taskByDate.get(task.placementDate()).add(calendarMapper.MonthlyTaskResultToResponse(task));
        }

        List<DayOfMonth> days = new ArrayList<>();
        for(LocalDate date : datesInRange) {
            days.add(DayOfMonth.builder()
                            .date(date)
                            .events(eventByDate.get(date))
                            .taskCount(taskByDate.get(date).size())
                            .tasks(taskByDate.get(date))
                    .build());
        }

        return MonthlyResponse.builder()
                .labelPalette(labelPalette)
                .spanEvents(spanEvents)
                .days(days)
                .build();
    }

    private List<LabelItem> buildMonthlyLabelPalette(String userId, List<CalendarMonthlyEventResult> monthlyEvents, List<CalendarMonthlyTaskResult> taskResults) {
        System.out.println("[getMonthly] userId = " + userId);
        Set<Long> labelIds = new LinkedHashSet<>();
        for (CalendarMonthlyEventResult event : monthlyEvents) {
            if (event.labels() != null && !event.labels().isEmpty()) {
                labelIds.addAll(event.labels());
            }
        }
        for (CalendarMonthlyTaskResult task : taskResults) {
            if (task.labels() != null && !task.labels().isEmpty()) {
                labelIds.addAll(task.labels());
            }
        }
        if (labelIds.isEmpty()) {
            return List.of();
        }

        System.out.println("label Ids : " + labelIds);
        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        return LabelUtil.getTitleAndColorKeyByIdsForResponse(userSetting, new ArrayList<>(labelIds));
    }

    private List<LocalDate> buildDateRange(LocalDate start, LocalDate end) {
        List<LocalDate> dates = new ArrayList<>();
        for(LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            dates.add(date);
        }
        return dates;
    }

    private List<LocalDate> expandRepeatDates(LocalDateTime startAt, Repeat repeat,
                                              LocalDate rangeStart, LocalDate rangeEnd) {
        List<LocalDate> result = new ArrayList<>();
        if (repeat == null) return result;

        LocalDateTime cursor = rangeStart.atStartOfDay().minusSeconds(1);
        LocalDateTime rangeEndTime = rangeEnd.atTime(LocalTime.MAX);

        int safeGuard = 0;
        while (safeGuard++ < 1000) {

            LocalDateTime next = findNextOccurrenceStartAfter(startAt, repeat, cursor);
            if (next == null || next.isAfter(rangeEndTime)) break;

            LocalDate occDate = next.toLocalDate();
            System.out.println("cursor=" + cursor + " next=" + next + " occDate=" + occDate);

            if (repeat.getExceptionDates() != null && repeat.getExceptionDates().contains(occDate)) {
                cursor = next.plusSeconds(1);
                continue;
            }

            if (!occDate.isBefore(rangeStart) && !occDate.isAfter(rangeEnd)) {
                result.add(occDate);
            }

            cursor = next.plusSeconds(1);

        }
        return result;
    }
}
