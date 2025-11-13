package whatta.Whatta.user.entity;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import whatta.Whatta.global.label.Label;
import whatta.Whatta.user.enums.DefaultMainView;
import whatta.Whatta.user.enums.StartOfWeek;

import java.util.ArrayList;
import java.util.List;

@Document("user_settings")
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Builder(toBuilder = true)
public class UserSetting {

    @Id
    private String id;

    @NotNull
    private String userId;

    @Builder.Default
    private StartOfWeek startOfWeek = StartOfWeek.SUNDAY;

    @Builder.Default
    private DefaultMainView defaultMainView = DefaultMainView.WEEKLY;

    @Valid
    @Builder.Default
    private List<Label> labels = new ArrayList<>();

    @Builder.Default
    private List<ReminderPreset> reminderPresets = new ArrayList<>();

    @Builder.Default
    private ScheduleSummary scheduleSummary = ScheduleSummary.builder().build();
}
