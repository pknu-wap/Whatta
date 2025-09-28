package whatta.Whatta.event.payload.request;


import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
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

    @Schema(type = "string", format = "time", example = "18:00:00")
    private LocalTime startTime;

    @Schema(type = "string", format = "time", example = "18:00:00")
    private LocalTime endTime;

    @Valid
    private RepeatRequest repeat;

    @NotNull
    private String colorKey;
}
