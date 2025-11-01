package whatta.Whatta.ocr.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.ocr.client.ClovaOcrClient;
import whatta.Whatta.ocr.payload.request.ImageUploadRequest;
import whatta.Whatta.ocr.payload.response.ClovaOcrResponse;

@Service
@AllArgsConstructor
public class OcrService {

    private final ClovaOcrClient ocrClient;

    public ClovaOcrResponse uploadImage(String userid, ImageUploadRequest request) {
        //다음 이슈에서 event 객체로 변환하여 반환
        //현재 이슈에서는 ocr 연동만 구현할 예정

        return ocrClient.callApi(request);
    }
}
