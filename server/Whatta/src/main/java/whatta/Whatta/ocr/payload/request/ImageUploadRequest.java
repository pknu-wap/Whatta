package whatta.Whatta.ocr.payload.request;

import whatta.Whatta.ocr.payload.enums.OcrImageType;
import whatta.Whatta.ocr.payload.dto.OcrRequestImage;

public record ImageUploadRequest(
        OcrImageType imageType,
        OcrRequestImage image
) {
}
