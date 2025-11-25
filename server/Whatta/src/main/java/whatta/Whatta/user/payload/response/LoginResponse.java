package whatta.Whatta.user.payload.response;

public record LoginResponse(
        String accessToken,
        String refreshToken
) { }
