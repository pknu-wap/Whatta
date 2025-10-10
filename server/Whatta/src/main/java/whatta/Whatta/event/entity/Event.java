package whatta.Whatta.event.entity;


import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import whatta.Whatta.global.label.Label;
import whatta.Whatta.global.repeat.Repeat;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Document("events")
@AllArgsConstructor
@Getter
@Builder(toBuilder = true)
public class Event {

    @Id
    private String id;

    @NotNull
    private String userId;

    private String title;

    private String content;

    private List<Label> labels; //라벨 설정하지 않으면 null

    @NotNull
    @Builder.Default
    private LocalDate startDate = LocalDate.now();

    @NotNull
    @Builder.Default
    private LocalDate endDate = LocalDate.now();

    private LocalTime startTime;
    private LocalTime endTime;

    private Repeat repeat;

    @NotNull
    private String colorKey;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();


    public boolean isPeriod() { return !startDate.equals(endDate); }
    public boolean hasTime() { return startTime!=null && endTime!=null; }
    public boolean isRepeat() { return repeat != null; }
}
