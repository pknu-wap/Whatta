package whatta.Whatta.global.repeat.payload;

import lombok.Builder;
import lombok.Getter;
import whatta.Whatta.global.anotation.ValidRepeat;
import whatta.Whatta.global.repeat.Repeat;
import whatta.Whatta.global.repeat.RepeatUnit;

import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
@ValidRepeat
public record RepeatResponse (
        int interval,
        RepeatUnit unit,
        List<String> on,
        LocalDate endDate,
        List<LocalDate> exceptionDates
){
    public static RepeatResponse fromEntity(Repeat repeat){ //변환로직은 추후에 서비스로 이동
        if (repeat == null) return null;
        return RepeatResponse.builder()
                .interval(repeat.getInterval())
                .unit(repeat.getUnit())
                .on(repeat.getOn())
                .endDate(repeat.getEndDate())
                .exceptionDates(repeat.getExceptionDates())
                .build();
    }
}
