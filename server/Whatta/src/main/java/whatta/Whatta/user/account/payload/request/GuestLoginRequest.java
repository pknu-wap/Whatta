package whatta.Whatta.user.account.payload.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;


@Getter
public class GuestLoginRequest
{
    @NotBlank
    private String installationId;
}
