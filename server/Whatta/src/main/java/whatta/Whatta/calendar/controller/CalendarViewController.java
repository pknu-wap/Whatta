package whatta.Whatta.calendar.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import whatta.Whatta.calendar.service.CalendarViewService;
import whatta.Whatta.global.payload.Response;

import java.time.LocalDate;
import java.time.YearMonth;

@RestController
@RequestMapping("/api/calendar")
@AllArgsConstructor
@PreAuthorize("isAuthenticated()")
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "Calendar", description = "일간/주간/월간 조회 API")
public class CalendarViewController {

    private final CalendarViewService calendarViewService;

    @GetMapping("/daily")
    @Operation(summary = "일간 조회", description = "해당 날짜의 일정과 작업을 조회합니다.")
    public ResponseEntity<?> getDaily(@AuthenticationPrincipal String userId, @RequestParam LocalDate date) {
        return Response.ok("success get events and tasks for " + date, calendarViewService.getDaily(userId, date));
    }

    @GetMapping("/weekly")
    @Operation(summary = "주간 조회", description = "startDate 와 endDate 에 포함되거나 걸치는 일정과 작업을 조회합니다.")
    public ResponseEntity<?> getWeekly(@AuthenticationPrincipal String userId,
                                       @RequestParam LocalDate startDate, @RequestParam LocalDate endDate) {
        return Response.ok("success get events and tasks between " + startDate + " and " + endDate,
                calendarViewService.getWeekly(userId, startDate, endDate));
    }

    @GetMapping("/monthly")
    @Operation(summary = "월간 조회", description = "해당 월의 일정과 작업을 조회합니다.")
    public ResponseEntity<?> getMonthly(@AuthenticationPrincipal String userId,
                                       @RequestParam
                                       @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return Response.ok("success get events and tasks for " + month, calendarViewService.getMonthly(userId, month));
    }
}
