package whatta.Whatta.user.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import whatta.Whatta.user.enums.DefaultMainView;
import whatta.Whatta.user.enums.StartOfWeek;

import java.util.ArrayList;
import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Builder(toBuilder = true)
public class UserSetting {

    @Builder.Default
    private StartOfWeek startOfWeek = StartOfWeek.SUNDAY;

    @Builder.Default
    private DefaultMainView defaultMainView = DefaultMainView.WEEKLY;

    @Builder.Default
    private List<String> labels = new ArrayList<>();

    //TODO: 알림 default 값은 알림 구현할 때 함께 구현하기

    public void updateLabels(List<String> labels) {
        this.labels.clear();
        this.labels.addAll(labels);
    }
}
