package whatta.Whatta.event.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import whatta.Whatta.event.entity.Event;
import whatta.Whatta.event.payload.request.EventCreateRequest;
import whatta.Whatta.event.payload.response.Response;
import whatta.Whatta.event.repository.EventRepository;
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
}
