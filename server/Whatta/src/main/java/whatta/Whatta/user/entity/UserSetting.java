package whatta.Whatta.user.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import whatta.Whatta.user.enums.DefaultMainView;
import whatta.Whatta.user.enums.StartOfWeek;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Builder
public class UserSetting {

    @Builder.Default
    private StartOfWeek startOfWeek = StartOfWeek.SUNDAY;

    @Builder.Default
    private DefaultMainView defaultMainView = DefaultMainView.WEEKLY;

    //TODO: 알림 default 값은 알림 구현할 때 함께 구현하기
}
