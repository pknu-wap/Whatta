package whatta.Whatta.image.payload.response;

import lombok.Builder;

import java.util.Map;

@Builder
public record SignedUrlCreateResponse(
        String objectKey,
        String signedUrl,
        String httpMethod,
        long expiresInSeconds,
        Map<String, String> requiredHeaders
) {
}
