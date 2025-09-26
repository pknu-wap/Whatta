package whatta.Whatta.global.payload.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import whatta.Whatta.global.anotation.ValidRepeat;
import whatta.Whatta.global.entity.Repeat;
import whatta.Whatta.global.enums.RepeatUnit;

import java.time.LocalDate;
import java.util.List;

@Getter
@NoArgsConstructor
@ValidRepeat
public class RepeatRequest {
    private int interval;
    private RepeatUnit unit;
    private List<String> on;
    private LocalDate endDate;

    public Repeat toEntity() { //변환로직은 추후에 서비스로 이동
        return Repeat.builder()
                .interval(interval)
                .unit(unit)
                .on(on)
                .endDate(endDate)
                .build();
    }
}
