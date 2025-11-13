package whatta.Whatta.user.entity;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Builder(toBuilder = true)
public class ReminderPreset {
    @Id
    private String id;

    @NotNull
    private int day; //0: 당일, 1: 하루 전, 2: 이틀 전
    @NotNull
    private int hour; //0~23
    @NotNull
    private int minute; //0~59
}
