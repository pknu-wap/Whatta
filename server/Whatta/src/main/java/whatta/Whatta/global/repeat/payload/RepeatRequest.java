package whatta.Whatta.global.repeat.payload;

import lombok.Getter;
import lombok.NoArgsConstructor;
import whatta.Whatta.global.anotation.ValidRepeat;
import whatta.Whatta.global.repeat.Repeat;
import whatta.Whatta.global.repeat.RepeatUnit;

import java.time.LocalDate;
import java.util.List;

@ValidRepeat
public record RepeatRequest (
    int interval,
    RepeatUnit unit,
    List<String> on,
    LocalDate endDate,
    List<LocalDate> exceptionDates
){
    public Repeat toEntity() { //변환로직은 추후에 서비스로 이동
        return Repeat.builder()
                .interval(interval)
                .unit(unit)
                .on(on)
                .endDate((endDate == null)? LocalDate.of(2999, 12, 31) : endDate)
                .exceptionDates(exceptionDates)
                .build();
    }
}
