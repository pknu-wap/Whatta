package whatta.Whatta.ocr.payload.request;

import io.swagger.v3.oas.annotations.media.Schema;
import whatta.Whatta.ocr.payload.enums.OcrImageType;
import whatta.Whatta.ocr.payload.dto.OcrRequestImage;

public record ImageUploadRequest(
        @Schema(type = "string", format = "String", example = "COLLEGE_TIMETABLE")
        OcrImageType imageType,
        OcrRequestImage image
) {
}
