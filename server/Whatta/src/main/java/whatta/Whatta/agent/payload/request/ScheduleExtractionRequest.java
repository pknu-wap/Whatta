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
            @Schema(type = "string", example = "png")
            String format,
            @Schema(type = "string", example = "iVBORw0KGgoAAAANSUhEUgAA...")
            String data,
            @Schema(type = "string", example = "https://example.com/schedule.png")
            String url
    ) {
        public boolean hasSource() {
            return hasData() || hasUrl();
        }

        public boolean hasData() {
            return data != null && !data.isBlank();
        }

        public boolean hasUrl() {
            return url != null && !url.isBlank();
        }

        public String normalizedFormat() {
            if (format == null || format.isBlank()) {
                return "jpg";
            }
            String lower = format.trim().toLowerCase();
            return switch (lower) {
                case "png" -> "png";
                case "jpeg" -> "jpeg";
                default -> "jpg";
            };
        }

        public String resolvedMimeType() {
            return switch (normalizedFormat()) {
                case "png" -> "image/png";
                case "jpeg" -> "image/jpeg";
                default -> "image/jpeg";
            };
        }

        public String sanitizedData() {
            if (!hasData()) {
                return "";
            }
            int prefixIndex = data.indexOf(',');
            return prefixIndex >= 0 ? data.substring(prefixIndex + 1).trim() : data.trim();
        }

        public String resolvedName() {
            return "schedule-image." + normalizedFormat();
        }
    }
}
