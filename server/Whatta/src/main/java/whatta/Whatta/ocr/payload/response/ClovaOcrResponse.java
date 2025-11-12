package whatta.Whatta.ocr.payload.response;

import whatta.Whatta.ocr.payload.dto.BoundingPoly;

import java.util.List;

public record ClovaOcrResponse(
        String version,
        String requestId,
        Long timestamp,
        List<OcrResponseImage> images
) {
    public record OcrResponseImage(
            String uid,
            String name,
            String inferResult, //SUCCESS | FAILURE | ERROR
            String message,
            List<OcrField> fields
            //List<OcrTable> tables //표추출 기능 사용 시
    ) {
    }

    public record OcrField(
            String inferText,
            BoundingPoly boundingPoly,
            Double inferConfidence, //인식된 텍스트의 신뢰도 (0~1, 1에 가까울 수록 텍스트 정확도가 높음) TODO: 추후 신뢰도가 낮은 텍스트의 처리 논의
            String type, //NORMAL | MULTI_BOX | CHECKBOX -> 현재 플랜으로는 항상 normal 이어야 함
            Boolean lineBreak //인식된 텍스트의 마지막 줄 여부 표시 -> true(마지막) | false
    ) {}
}
