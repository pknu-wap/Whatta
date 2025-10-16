package whatta.Whatta.calendar.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import whatta.Whatta.calendar.service.CalendarViewService;
import whatta.Whatta.global.payload.Response;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/calendar")
@AllArgsConstructor
@Tag(name = "Calendar", description = "일간/주간/월간 조회 API")
public class CalendarViewController {

    private final CalendarViewService calendarViewService;

    @GetMapping
    @Operation(summary = "일간 조회", description = "해당 날짜의 일정과 작업을 조회합니다.")
    public ResponseEntity<?> getDaily(@RequestParam LocalDate date) { //TODO: user 정보 함께 받아야 함
        //임시 유저 정보
        String userId = "user123";
        return Response.ok("success get events and tasks for " + date, calendarViewService.getDaily(userId, date));
    }
}
