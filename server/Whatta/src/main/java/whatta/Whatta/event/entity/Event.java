package whatta.Whatta.event.entity;


import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import whatta.Whatta.global.entity.Repeat;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Document("events")
@AllArgsConstructor
@Getter
@Builder
public class Event {

    @Id
    private String id;

    @NotNull
    private String userId;

    private String title;

    private String content;

    @Builder.Default
    private List<String> labels = new ArrayList<>();

    @NotNull
    @Builder.Default
    private LocalDate startDate = LocalDate.now();

    @NotNull
    @Builder.Default
    private LocalDate endDate = LocalDate.now();

    @Builder.Default
    private LocalTime startTime = LocalTime.now();
    @Builder.Default
    private LocalTime endTime = LocalTime.now();

    @Valid
    private Repeat repeat;

    @NotNull
    private String colorKey;

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
