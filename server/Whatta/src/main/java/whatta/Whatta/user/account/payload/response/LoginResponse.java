package whatta.Whatta.user.account.payload.response;

public record LoginResponse(
        String accessToken,
        String refreshToken
) { }
