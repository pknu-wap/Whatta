package whatta.Whatta.ocr.payload.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record TimetableImage(
        @Schema(type = "string", example = "jpg")
        String format, //jpg | jpeg | png (pdf와 tiff도 가능하나 미지원)
        String name,
        String data, //Base64 인코딩된 이미지 데이터
        String objectKey
) {
    public boolean hasData() {
        return data != null && !data.isBlank();
    }

    public boolean hasObjectKey() {
        return objectKey != null && !objectKey.isBlank();
    }

    public boolean hasSource() {
        return hasObjectKey() || hasData();
    }

    public String sanitizedData() {
        return hasData() ? data.trim() : "";
    }

    public String sanitizedObjectKey() {
        return hasObjectKey() ? objectKey.trim() : "";
    }
}
