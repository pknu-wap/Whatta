package whatta.Whatta.event.payload.response;

import lombok.Builder;
import whatta.Whatta.global.anotation.ValidRepeat;
import whatta.Whatta.event.entity.Repeat;
import whatta.Whatta.event.enums.RepeatUnit;

import java.time.LocalDate;
import java.util.List;

@Builder
@ValidRepeat
public record RepeatResponse (
        int interval,
        RepeatUnit unit,
        List<String> on,
        LocalDate endDate, //TODO: 프론트 코드와 함께 변경
        List<LocalDate> exceptionDates
){
    public static RepeatResponse fromEntity(Repeat repeat){ //변환로직은 추후에 서비스로 이동
        if (repeat == null) return null;
        return RepeatResponse.builder()
                .interval(repeat.getInterval())
                .unit(repeat.getUnit())
                .on(repeat.getOn())
                .endDate(repeat.getDeadline())
                .exceptionDates(repeat.getExceptionDates())
                .build();
    }
}
