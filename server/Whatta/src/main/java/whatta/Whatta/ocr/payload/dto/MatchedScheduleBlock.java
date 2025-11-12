package whatta.Whatta.ocr.payload.dto;

import lombok.Builder;

import java.util.List;

@Builder
public record MatchedScheduleBlock(
        int blockId,
        String weekDay, //월~일
        String startTime, //HH:mm
        String endTime,
        List<String> texts //과목명, 강의실 등의 텍스트
) {
}
