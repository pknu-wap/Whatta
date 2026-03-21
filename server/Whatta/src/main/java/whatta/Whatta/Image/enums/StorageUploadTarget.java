package whatta.Whatta.Image.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum StorageUploadTarget {
    AGENT_IMAGE("agent-images"),
    OCR_IMAGE("ocr-images");

    private final String pathSegment;
}
