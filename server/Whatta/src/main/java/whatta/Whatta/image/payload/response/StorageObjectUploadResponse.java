package whatta.Whatta.image.payload.response;

import lombok.Builder;

@Builder
public record StorageObjectUploadResponse(
        String objectKey,
        String contentType,
        long size,
        String downloadSignedUrl
) {
}
