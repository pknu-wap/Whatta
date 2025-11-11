package whatta.Whatta.ocr.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.ocr.client.ClovaOcrClient;
import whatta.Whatta.ocr.mapper.ClovaOcrMapper;
import whatta.Whatta.ocr.payload.dto.DetectedBlock;
import whatta.Whatta.ocr.payload.dto.MatchedScheduleBlock;
import whatta.Whatta.ocr.payload.request.ImageUploadRequest;
import whatta.Whatta.ocr.payload.response.ClovaOcrResponse;
import whatta.Whatta.ocr.util.ScheduleBlockDetector;
import whatta.Whatta.ocr.util.ScheduleMatcher;

import java.util.List;

@Service
@AllArgsConstructor
public class OcrService {

    private final ClovaOcrClient ocrClient;
    private final ScheduleBlockDetector scheduleBlockDetector;

    public List<MatchedScheduleBlock> uploadImage(String userid, ImageUploadRequest request) {

        //ocr로 텍스트 가져옴
        ClovaOcrResponse ocrResponse = ocrClient.callApi(request);
        //opencv로 각 시간표 범위 좌표 추출
        DetectedBlock detectedBlock = scheduleBlockDetector.findTimeBox(request.image().data());
        //ocr로 받은 텍스트와 색깔 범위 매칭
        return ScheduleMatcher.matchAll(detectedBlock, ClovaOcrMapper.toOcrTextList(ocrResponse));

        //결과를 event Create dto로 생성 -> 값 채워서 -> 리스트로 반환
        //이건 추후 구현
    }
}
