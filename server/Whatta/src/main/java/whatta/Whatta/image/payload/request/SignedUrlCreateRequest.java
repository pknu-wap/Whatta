package whatta.Whatta.image.payload.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import whatta.Whatta.image.enums.StorageUploadTarget;

public record SignedUrlCreateRequest(
        @NotNull
        @Schema(example = "AGENT_IMAGE")
        StorageUploadTarget target,

        @NotBlank
        @Schema(example = "image/jpeg")
        String contentType
) {
    public String normalizedContentType() {
        return contentType == null ? "" : contentType.trim().toLowerCase();
    }
}
