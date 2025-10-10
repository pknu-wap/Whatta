package whatta.Whatta.event.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import whatta.Whatta.event.payload.request.EventCreateRequest;
import whatta.Whatta.global.payload.Response;
import whatta.Whatta.event.service.EventService;

@RestController
@RequestMapping("/api/event")
@AllArgsConstructor
@Tag(name = "Event", description = "일정 API")
public class EventController {

    private final EventService eventService;

    @PostMapping
    @Operation(summary = "일정 생성", description = "새로운 일정을 생성합니다.")
    public ResponseEntity<?> createEvent (@RequestBody @Validated EventCreateRequest request) {
        eventService.createEvent(request);
        return Response.ok("success create event");
    }

    @GetMapping("/{eventId}")
    @Operation(summary = "일정 상세 조회", description = "eventId로 일정의 상세 정보를 조회합니다.")
    public ResponseEntity<?> getEvent(@PathVariable String eventId) {
        return Response.ok("success get event", eventService.getEventDetails(eventId));
    }
}
