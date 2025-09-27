package whatta.Whatta.event.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.event.entity.Event;
import whatta.Whatta.event.payload.request.EventCreateRequest;
import whatta.Whatta.event.repository.EventRepository;
import whatta.Whatta.global.entity.Repeat;
import whatta.Whatta.global.util.LabelsBuilder;

import java.util.ArrayList;
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
                .repeat(new Repeat(request.getRepeat()))
                .colorKey(request.getColorKey())
                .build();

        eventRepository.save(event);
    }
}
