package whatta.Whatta.event.entity;


import jakarta.validation.constraints.NotBlank;
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

    @NotBlank
    @Builder.Default
    private String title = "새로운 일정";

    @NotNull
    @Builder.Default
    private String content = "";

    @NotNull
    @Builder.Default
    private List<Label> labels = new ArrayList<>(); //라벨 설정하지 않으면 빈 리스트

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    @Builder.Default
    private LocalTime startTime = null;
    @Builder.Default
    private LocalTime endTime = null;

    private Repeat repeat;

    @NotNull
    private String colorKey;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    @Builder.Default
    private LocalDateTime editedAt = LocalDateTime.now();

    public boolean isPeriod() { return !startDate.equals(endDate); }
    public boolean hasTime() { return startTime!=null && endTime!=null; }
    public boolean isRepeat() { return repeat != null; }
}
