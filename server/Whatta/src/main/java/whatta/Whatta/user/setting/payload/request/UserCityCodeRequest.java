package whatta.Whatta.user.setting.payload.request;

import jakarta.validation.constraints.NotBlank;

public record UserCityCodeRequest(
        @NotBlank
        String cityCode
) {}
