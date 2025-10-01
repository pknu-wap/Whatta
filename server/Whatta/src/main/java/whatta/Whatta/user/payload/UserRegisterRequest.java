package whatta.Whatta.user.payload;

import lombok.Getter;
import whatta.Whatta.user.entity.UserSetting;

@Getter
public class UserRegisterRequest {

    private UserSetting userSetting;
}
