package whatta.Whatta.ocr.payload.request;

import io.swagger.v3.oas.annotations.media.Schema;
import whatta.Whatta.ocr.payload.dto.TimetableImage;

public record TimetableImageUploadRequest(
        @Schema(type = "string", format = "String", example = "COLLEGE_TIMETABLE")
        TimetableImageType imageType,
        TimetableImage image
) {
        public enum TimetableImageType {
                COLLEGE_TIMETABLE, //대학교 시간표
                SCHOOL_TIMETABLE //중고등학교 시간표
        }
}
