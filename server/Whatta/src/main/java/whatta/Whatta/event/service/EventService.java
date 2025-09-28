package whatta.Whatta.event.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.event.entity.Event;
import whatta.Whatta.event.payload.request.EventCreateRequest;
import whatta.Whatta.event.payload.response.EventDetailsResponse;
import whatta.Whatta.event.repository.EventRepository;
import whatta.Whatta.global.payload.response.RepeatResponse;
import whatta.Whatta.global.util.LabelsBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@AllArgsConstructor
public class EventService {

    private final EventRepository eventRepository;

    public void createEvent(EventCreateRequest request) { //TODO: user 정보 받아와서 함께 db에 저장

        List<String> labels = LabelsBuilder.BuildLabels(request.getLabels(), "일정");

        Event event = Event.builder()
                .userId("user123")
                .title(request.getTitle())
                .content(request.getContent())
                .labels(labels)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .repeat((request.getRepeat() == null) ? null : request.getRepeat().toEntity())
                .colorKey(request.getColorKey())
                .build();

        eventRepository.save(event);
    }

    public EventDetailsResponse getEventDetails(String eventId) {

        Event event = eventRepository.findEventByIdAndUserId(eventId, "user123") //TODO: 게스트 로그인 구현 후, user 정보로 대체
                .orElseThrow(() -> new RuntimeException("Event with id " + eventId + " not found"));

        return EventDetailsResponse.builder()
                .title(event.getTitle())
                .content(event.getContent())
                .labels(event.getLabels())
                .isPeriod(event.isPeriod())
                .hasTime(event.hasTime())
                .isRepeat(event.isRepeat())
                .startAt(buildDateTime(event.getStartDate(), event.getStartTime()))
                .endAt(buildDateTime(event.getEndDate(), event.getEndTime()))
                .repeat(RepeatResponse.fromEntity(event.getRepeat())) //TODO: dto 변환로직 추후 추가
                .colorKey(event.getColorKey())
                .build();
    }

    private LocalDateTime buildDateTime(LocalDate date, LocalTime time) {
        LocalTime t = (time != null) ? time : LocalTime.MIDNIGHT; //시간지정이 없으면
        return LocalDateTime.of(date, t);
    }
}
