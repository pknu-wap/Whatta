package whatta.Whatta.calendar.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.calendar.payload.DailyResponse;
import whatta.Whatta.calendar.payload.dto.CalendarDailyEventsResult;
import whatta.Whatta.calendar.payload.dto.CalendarDailyTasksResult;
import whatta.Whatta.calendar.repository.CalendarEventsRepositoryCustom;
import whatta.Whatta.calendar.repository.CalendarTasksRepositoryCustom;

import java.time.LocalDate;

@Service
@AllArgsConstructor
public class CalendarViewService {

    CalendarEventsRepositoryCustom calendarEventsRepository;
    CalendarTasksRepositoryCustom calendarTasksRepository;

    public DailyResponse getDaily(String userId, LocalDate date) {

        CalendarDailyEventsResult eventsResult = calendarEventsRepository.getDailyViewByUserId(userId, date);
        CalendarDailyTasksResult tasksResult = calendarTasksRepository.getDailyViewByUserId(userId, date);
        return DailyResponse.builder()
                .allDayEvents(eventsResult.allDayEvents())
                .allDayTasks(tasksResult.allDayTasks())
                .timedEvents(eventsResult.timedEvents())
                .timedTasks(tasksResult.timedTasks())
                .build();

    }
}
