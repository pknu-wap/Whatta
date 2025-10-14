package whatta.Whatta.user.payload.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;


@Getter
public class GuestLoginRequest
{
    @NotBlank
    private String installationId;
}
