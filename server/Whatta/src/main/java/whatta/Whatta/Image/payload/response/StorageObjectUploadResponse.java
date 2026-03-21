package whatta.Whatta.Image.payload.response;

import lombok.Builder;

@Builder
public record StorageObjectUploadResponse(
        String objectKey,
        String contentType,
        long size,
        String downloadSignedUrl
) {
}
