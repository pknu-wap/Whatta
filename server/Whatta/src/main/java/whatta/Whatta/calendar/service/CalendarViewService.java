package whatta.Whatta.calendar.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.calendar.payload.DailyResponse;
import whatta.Whatta.calendar.repository.CalendarEventsRepositoryCustom;

import java.time.LocalDate;

@Service
@AllArgsConstructor
public class CalendarViewService {

    CalendarEventsRepositoryCustom calendarEventsRepository;

    public DailyResponse getDaily(String userId, LocalDate date) {
        return DailyResponse.builder()
                .events(calendarEventsRepository.getDailyViewByUserId(userId, date)).build();

    }
}
