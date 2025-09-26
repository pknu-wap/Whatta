package whatta.Whatta.global.payload.response;

import lombok.Builder;
import lombok.Getter;
import whatta.Whatta.global.entity.Repeat;
import whatta.Whatta.global.enums.RepeatUnit;

import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
public class RepeatResponse {
    private final int interval;
    private final RepeatUnit unit;
    private final List<String> on;
    private final LocalDate endDate;

    public static RepeatResponse fromEntity(Repeat repeat){
        return RepeatResponse.builder()
                .interval(repeat.getInterval())
                .unit(repeat.getUnit())
                .on(repeat.getOn())
                .endDate(repeat.getEndDate())
                .build();
    }
}
