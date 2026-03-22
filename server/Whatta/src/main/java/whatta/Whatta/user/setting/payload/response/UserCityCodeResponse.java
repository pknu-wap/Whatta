package whatta.Whatta.user.setting.payload.response;

import lombok.Builder;

@Builder
public record UserCityCodeResponse(
        String cityCode
) {}
