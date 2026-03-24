package whatta.Whatta.ocr.service;

import lombok.AllArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import java.util.Comparator;
import java.util.List;
import java.util.regex.Pattern;

@Service
@AllArgsConstructor
public class OcrService {

    private static final Logger log = LoggerFactory.getLogger(OcrService.class);
    private static final Pattern NUMERIC_ONLY_TITLE = Pattern.compile("^[0-9\\s./%|+\\-]+$");

    private final ClovaOcrClient ocrClient;
    private final ScheduleBlockDetector scheduleBlockDetector;

    public ImageToEventResponse uploadImage(String userid, ImageUploadRequest request) {

        //ocr로 텍스트 가져옴
        ClovaOcrResponse ocrResponse = ocrClient.callApi(request);
        List<whatta.Whatta.ocr.payload.dto.OcrText> ocrTexts = ClovaOcrMapper.toOcrTextList(ocrResponse);
        //opencv로 각 시간표 범위 좌표 추출
        DetectedBlock detectedBlock = scheduleBlockDetector.findTimeBox(request.image().data());
        int blockCount = detectedBlock == null || detectedBlock.blocks() == null ? -1 : detectedBlock.blocks().size();
        log.info("[OCR_PIPELINE] stage=post-detect ocrTextCount={} detectedBlockCount={}", ocrTexts.size(), blockCount);
        //ocr로 받은 텍스트와 색깔 범위 매칭
        List<MatchedScheduleBlock> matches = ScheduleMatcher.matchAll(detectedBlock, ocrTexts);
        //요일 순 정렬
        matches.sort(new Comparator<MatchedScheduleBlock>() {
            @Override
            public int compare(MatchedScheduleBlock a, MatchedScheduleBlock b) {
                int dayCmp = Integer.compare(weekdayIndex(a.weekDay()), weekdayIndex(b.weekDay()));
                if (dayCmp != 0) {
                    return dayCmp;
                }
                // weekDay가 같으면 시작 시간(HH:mm) 문자열 비교로 정렬
                return a.startTime().compareTo(b.startTime());
            }
        });
        //text를 title과 content로 분리하고 dto로 생성
        List<ImageToEventResponse.ImageToEvent> response = new ArrayList<>();
        for(MatchedScheduleBlock block : matches) {
            String[] result = ScheduleBlockMapper.splitTitleAndContent(block.texts());
            if (isNumericOnlyNoise(result[0], result[1])) {
                continue;
            }
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

    private static boolean isNumericOnlyNoise(String title, String content) {
        String normalizedTitle = title == null ? "" : title.trim();
        String normalizedContent = content == null ? "" : content.trim();
        if (normalizedTitle.isEmpty()) {
            return false;
        }
        if (!normalizedContent.isEmpty()) {
            return false;
        }
        return NUMERIC_ONLY_TITLE.matcher(normalizedTitle).matches();
    }

    private static int weekdayIndex(String day) {
        if (day == null) return 7;
        return switch (day) {
            case "MON" -> 0;
            case "TUE" -> 1;
            case "WED" -> 2;
            case "THU" -> 3;
            case "FRI" -> 4;
            case "SAT" -> 5;
            case "SUN" -> 6;
            default -> 7; //알 수 없는 값은 맨 뒤
        };
    }
}
