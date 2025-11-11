package whatta.Whatta.ocr.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.ocr.mapper.ClovaOcrMapper;
import whatta.Whatta.ocr.mapper.ScheduleBlockMapper;
import whatta.Whatta.ocr.payload.dto.DetectedBlock;
import whatta.Whatta.ocr.payload.dto.MatchedScheduleBlock;
import whatta.Whatta.ocr.payload.request.ImageUploadRequest;
import whatta.Whatta.ocr.payload.response.ClovaOcrResponse;
import whatta.Whatta.ocr.payload.response.ImageToEventResponse;
import whatta.Whatta.ocr.util.ScheduleBlockDetector;
import whatta.Whatta.ocr.util.ScheduleMatcher;

import java.util.ArrayList;
import java.util.List;

@Service
@AllArgsConstructor
public class OcrService {

    private final ClovaOcrClient ocrClient;
    private final ScheduleBlockDetector scheduleBlockDetector;

    public ImageToEventResponse uploadImage(String userid, ImageUploadRequest request) {

        //ocr로 텍스트 가져옴
        ClovaOcrResponse ocrResponse = ocrClient.callApi(request);
        //opencv로 각 시간표 범위 좌표 추출
        DetectedBlock detectedBlock = scheduleBlockDetector.findTimeBox(request.image().data());
        //ocr로 받은 텍스트와 색깔 범위 매칭
        List<MatchedScheduleBlock> matches = ScheduleMatcher.matchAll(detectedBlock, ClovaOcrMapper.toOcrTextList(ocrResponse));
        //text를 title과 content로 분리하고 dto로 생성
        List<ImageToEventResponse.ImageToEvent> response = new ArrayList<>();
        for(MatchedScheduleBlock block : matches) {
            String[] result = ScheduleBlockMapper.splitTitleAndContent(block.texts());
            response.add(ImageToEventResponse.ImageToEvent.builder()
                            .title(result[0])
                            .content(result[1])
                            .weekDay(block.weekDay())
                            .startTime(block.startTime())
                            .endTime(block.endTime())
                    .build());
        }
        return ImageToEventResponse.builder()
                .events(response)
                .build();
    }
}
