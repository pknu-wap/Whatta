package whatta.Whatta.agent.payload.request;

import io.swagger.v3.oas.annotations.media.Schema;

public record ScheduleExtractionRequest(
        @Schema(type = "string", example = "내일 19시에 왓타 회의 추가")
        String text,
        ScheduleExtractionForImage image
) {
    public boolean hasText() {
        return text != null && !text.isBlank();
    }

    public boolean hasImage() {
        return image != null && image.hasSource();
    }

    public record ScheduleExtractionForImage(
            @Schema(type = "string", example = "uploads/agent-images/67c9f2e3349f5d4a3f510001/20260321/8d9d9d8c-f4bc-4db8-a1f8-b2ffbd6b9f61.jpg")
            String objectKey
    ) {
        public boolean hasSource() {
            return hasObjectKey();
        }

        public boolean hasObjectKey() {
            return objectKey != null && !objectKey.isBlank();
        }

        public String sanitizedObjectKey() {
            return hasObjectKey() ? objectKey.trim() : "";
        }
    }
}
