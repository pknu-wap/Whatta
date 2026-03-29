package whatta.Whatta.ocr.payload.request;

import lombok.Builder;
import whatta.Whatta.ocr.payload.dto.ClovaRequestImage;

import java.util.List;

@Builder
public record ClovaOcrRequest(
        String version, //V2
        String requestId,
        Long timestamp,
        String lang, //ko
        List<ClovaRequestImage> images,
        Boolean enableTableDetection //표추출 사용여부 false
) {
}
