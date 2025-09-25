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
import whatta.Whatta.event.repository.EventRepository;

@RestController
@RequestMapping("/api/test")
@AllArgsConstructor
@Tag(name = "Event_Test", description = "일정 테스트 API")
public class EventTestController {

    private final EventRepository eventRepository;

    @PostMapping("/event")
    @Operation(summary = "일정 생성", description = "test")
    public ResponseEntity<?> createEvent (@RequestBody @Validated EventCreateRequest request) {
        Event event = request.toEntity();
        return ResponseEntity.ok(eventRepository.save(event));
    }
}
