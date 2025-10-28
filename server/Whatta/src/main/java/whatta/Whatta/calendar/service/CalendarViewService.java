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
import whatta.Whatta.global.util.LabelUtils;
import whatta.Whatta.user.entity.UserSetting;
import whatta.Whatta.user.repository.UserSettingRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

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
        List<LabelItem> labelPalette = buildLabelPalette(userId, eventsResult,tasksResult);

        List<AllDaySpanEvent> spanEvents = new ArrayList<>(); //시간지정 없는 기간 event
        List<AllDayEvent> allDayEvents = new ArrayList<>(); //시간지정 없고 기간도 없는 event
        for(CalendarAllDayEventItem event : eventsResult.allDayEvents()) {
            if (event.isSpan()) {
                spanEvents.add(calendarMapper.allDayEventItemToSpanResponse(event));
            }
            else {  //시간지정 없고 기간도 없는 event
                allDayEvents.add(calendarMapper.allDayEventItemToResponse(event));
            }
        }

        //시간지정 없는 task
        List<AllDayTask> allDayTasks = new ArrayList<>();
        for(CalendarAllDayTaskItem task : tasksResult.allDayTasks()) {
            allDayTasks.add(calendarMapper.allDayTaskItemToResponse(task));
        }

        //시간지정 있는 event -> 해당 날짜에 알맞게 클리핑
        List<TimedEvent> timedEvents = new ArrayList<>();
        for(CalendarTimedEventItem event : eventsResult.timedEvents() ) {
            LocalTime clippedStartTime = date.equals(event.startDate()) ? event.startTime() : LocalTime.MIN; //date가 기간의 첫날이 아니면 -> 0시부터
            LocalTime clippedEndTime = date.equals(event.endDate()) ? event.endTime() : LocalTime.MAX; //date가 기간의 마지막 날이 아니면 -> 24시로 끊음

            timedEvents.add(calendarMapper.timedEventItemToResponse(event, clippedStartTime, clippedEndTime));
        }

        //시간지정 있는 task
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

        //시간지정 없는 기간 event
        List<AllDaySpanEvent> spanEvents = new ArrayList<>();
        for(CalendarAllDayEventItem event : eventsResult.allDayEvents()) {
            if (event.isSpan()) {
                spanEvents.add(calendarMapper.allDayEventItemToSpanResponse(event));
            }
            else {  //시간지정 없고 기간도 없는 event
                allDayEventsByDate.get(event.startDate()).add(calendarMapper.allDayEventItemToResponse(event));
            }
        }

        //시간지정 없는 task
        for(CalendarAllDayTaskItem task : tasksResult.allDayTasks()) {
            allDayTasksByDate.get(task.placementDate()).add(calendarMapper.allDayTaskItemToResponse(task));
        }

        //시간지정 있는 event -> 기간 내에서 날짜별 클리핑
        for(CalendarTimedEventItem event : eventsResult.timedEvents() ) {
            LocalDate clipStartDate = event.startDate().isBefore(start) ? start : event.startDate();
            LocalDate clipEndDate = event.endDate().isAfter(end) ? end : event.endDate();

            for(LocalDate date = clipStartDate; !date.isAfter(clipEndDate); date = date.plusDays(1)) {
                LocalTime clippedStartTime = date.equals(event.startDate()) ? event.startTime() : LocalTime.MIN; //date가 기간의 첫날이 아니면 -> 0시부터
                LocalTime clippedEndTime = date.equals(event.endDate()) ? event.endTime() : LocalTime.MAX; //date가 기간의 마지막 날이 아니면 -> 24시로 끊음

                timedEventsByDate.get(date)
                        .add(calendarMapper.timedEventItemToResponse(event, clippedStartTime, clippedEndTime));
            }
        }

        //시간지정 있는 task
        for(CalendarTimedTaskItem task : tasksResult.timedTasks()) {
            timedTasksByDate.get(task.placementDate()).add(calendarMapper.timedTaskItemToResponse(task));
        }

        List<WeekDay> days = new ArrayList<>();
        for(LocalDate date : datesInRange) {
            days.add(WeekDay.builder()
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

        return LabelUtils.getTitleAndColorKeyByIdsForResponse(userSetting, new ArrayList<>(labelIds));
    }

    public MonthlyResponse getMonthly(String userId, YearMonth month) {

        LocalDate start = month.atDay(1);
        LocalDate end = month.atEndOfMonth();

        List<LocalDate> datesInRange = buildDateRange(start, end);

        //db 조회를 병렬로
        CompletableFuture<List<CalendarMonthlyEventResult>> eventsFuture =
                CompletableFuture.supplyAsync(() -> calendarEventsRepository.getMonthlyViewByUserId(userId, start, end), calendarExecutor);
        CompletableFuture<List<CalendarMonthlyTaskCountResult>> tasksFuture =
                CompletableFuture.supplyAsync(() -> calendarTasksRepository.getMonthlyViewByUserId(userId, start, end), calendarExecutor);

        //두 조회가 끝난 후 조립
        List<CalendarMonthlyEventResult> eventsResult = eventsFuture.join();
        List<CalendarMonthlyTaskCountResult> tasksResult = tasksFuture.join();

        //라벨 리스트
        List<LabelItem> labelPalette = buildMonthlyLabelPalette(userId, eventsResult);

        Map<LocalDate, List<MonthEvent>> eventByDate = new HashMap<>();
        Map<LocalDate, Integer> taskCountByDate = new HashMap<>();
        for(LocalDate date : datesInRange) {
            eventByDate.put(date, new ArrayList<>());
            taskCountByDate.put(date, 0);
        }

        //기간 event
        List<MonthSpanEvent> spanEvents = new ArrayList<>();
        for(CalendarMonthlyEventResult event : eventsResult) {
            if (event.isSpan()) {
                spanEvents.add(calendarMapper.MonthlyEventResultToSpanResponse(event));
            }
            else {
                eventByDate.get(event.startDate()).add(calendarMapper.MonthlyEventResultToResponse(event));
            }
        }

        //task
        for(CalendarMonthlyTaskCountResult task : tasksResult) {
            taskCountByDate.put(task.placementDate(), task.count());
        }

        List<MonthDay> days = new ArrayList<>();
        for(LocalDate date : datesInRange) {
            days.add(MonthDay.builder()
                            .date(date)
                            .events(eventByDate.get(date))
                            .taskCount(taskCountByDate.get(date))
                    .build());
        }

        return MonthlyResponse.builder()
                .labelPalette(labelPalette)
                .spanEvents(spanEvents)
                .days(days)
                .build();
    }

    //TODO: 현재 월간은 이벤트만 라벨 목록을 반환함 -> 추후 task도 라벨id를 가지도록 리팩토링해야 함
    private List<LabelItem> buildMonthlyLabelPalette(String userId, List<CalendarMonthlyEventResult> monthlyEvents) {
        Set<Long> labelIds = new LinkedHashSet<>();
        for (CalendarMonthlyEventResult item : monthlyEvents) {
            if (item.labels() != null && !item.labels().isEmpty()) {
                labelIds.addAll(item.labels());
            }
        }
        if (labelIds.isEmpty()) {
            return List.of();
        }

        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        return LabelUtils.getTitleAndColorKeyByIdsForResponse(userSetting, new ArrayList<>(labelIds));
    }

    private List<LocalDate> buildDateRange(LocalDate start, LocalDate end) {
        List<LocalDate> dates = new ArrayList<>();
        for(LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            dates.add(date);
        }
        return dates;
    }
}
