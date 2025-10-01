package whatta.Whatta.global.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import whatta.Whatta.global.anotation.ValidRepeat;
import whatta.Whatta.global.enums.RepeatUnit;
import whatta.Whatta.global.payload.request.RepeatRequest;

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

    private LocalDate endDate;
}
