package whatta.Whatta.event.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import whatta.Whatta.event.payload.request.EventCreateRequest;
import whatta.Whatta.event.payload.request.EventUpdateRequest;
import whatta.Whatta.global.payload.Response;
import whatta.Whatta.event.service.EventService;

@RestController
@RequestMapping("/api/event")
@AllArgsConstructor
@PreAuthorize("isAuthenticated()")
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "Event", description = "일정 API")
public class EventController {

    private final EventService eventService;

    @PostMapping
    @Operation(summary = "일정 생성", description = "새로운 일정을 생성합니다.")
    public ResponseEntity<?> createEvent (@RequestBody @Validated EventCreateRequest request) {
        return Response.ok("success create event", eventService.createEvent(request));
    }

    @GetMapping("/{eventId}")
    @Operation(summary = "일정 상세 조회", description = "eventId로 일정의 상세 정보를 조회합니다.")
    public ResponseEntity<?> getEvent(@PathVariable String eventId) {
        return Response.ok("success get event", eventService.getEventDetails(eventId));
    }

    @PutMapping("/{eventId}")
    @Operation(summary = "일정 수정",
            description = "해당 일정을 수정합니다."
                    + "<br><br> <b>fieldsToClear 사용 안내</b>"
                    + "<br> 특정 필드를 초기화(비우기 또는 null 처리)할 때 사용합니다."
                    + "<br> 타입: <code>array&lt;string&gt;</code>"
                    + "<br> 초기화 불가 필드: startDate, endDate, colorKey")
    public ResponseEntity<?> updateEvent(@PathVariable String eventId,
                                         @RequestBody @Validated EventUpdateRequest request) {
        return Response.ok("success edit event", eventService.updateEvent(eventId, request));
    }

    @DeleteMapping("/{eventId}")
    @Operation(summary = "일정 삭제", description = "해당 일정을 삭제합니다.")
    public ResponseEntity<?> deleteEvent(@PathVariable String eventId) {
        eventService.deleteEvent(eventId);
        return Response.ok("success delete event");
    }
}
