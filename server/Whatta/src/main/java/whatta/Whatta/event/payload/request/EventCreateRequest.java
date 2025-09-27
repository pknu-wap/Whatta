package whatta.Whatta.event.payload.request;


import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import whatta.Whatta.event.entity.Event;
import whatta.Whatta.global.entity.Repeat;
import whatta.Whatta.global.payload.request.RepeatRequest;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Getter
public class EventCreateRequest {

    private String title;
    private String content;
    private List<String> labels;

    private LocalDate startDate;
    private LocalDate endDate;

    private LocalTime startTime;
    private LocalTime endTime;

    @Valid
    private RepeatRequest repeat;

    @NotNull
    private String colorKey;
}
