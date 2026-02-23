package whatta.Whatta.event.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import whatta.Whatta.event.enums.RepeatUnit;

import java.time.LocalDate;
import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Builder
public class Repeat {

    private int interval;

    private RepeatUnit unit;

    private List<String> on;

    private LocalDate deadline;

    private List<LocalDate> exceptionDates;
}
