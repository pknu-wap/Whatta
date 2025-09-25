package whatta.Whatta.event.payload.request;


import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import whatta.Whatta.event.entity.Event;
import whatta.Whatta.global.entity.Repeat;

import java.time.LocalDate;
import java.util.List;

@Getter
public class EventCreateRequest {
    @NotNull
    private String userId;

    private String title;
    private String content;
    private List<String> labels;

    private LocalDate startDate;
    private LocalDate endDate;

    @Valid
    private Repeat repeat;

    @NotNull
    private String colorKey;

    public Event toEntity() {
        return Event.builder()
                .userId(userId)
                .title(title)
                .content(content)
                .labels(labels)
                .startDate(startDate)
                .endDate(endDate)
                .repeat(repeat)
                .colorKey(colorKey)
                .build();
    }
}
