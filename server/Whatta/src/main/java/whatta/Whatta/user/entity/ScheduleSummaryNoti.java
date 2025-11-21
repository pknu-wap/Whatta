package whatta.Whatta.user.entity;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import whatta.Whatta.user.enums.NotifyDay;

import java.time.LocalTime;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Builder(toBuilder = true)
public class ScheduleSummaryNoti {

    @Builder.Default
    private boolean enabled = false;

    @NotNull
    @Builder.Default
    private NotifyDay notifyDay = NotifyDay.TODAY;

    @NotNull
    private LocalTime time;

}
