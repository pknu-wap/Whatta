package whatta.Whatta.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    //600-xx : event 관련 오류
    EVENT_NOT_FOUND(HttpStatus.NOT_FOUND, "600-1", "해당 일정이 존재하지 않습니다."),
    REQUIRED_DATE_MISSING(HttpStatus.BAD_REQUEST, "600-2", "일정은 날짜 지정이 필수입니다."),
    DATE_ORDER_INVALID(HttpStatus.BAD_REQUEST, "600-3", "끝나는 날짜가 시작 날짜보다 앞서선 안됩니다."),
    TIME_ORDER_INVALID(HttpStatus.BAD_REQUEST, "600-4", "끝나는 시간이 시작 시간보다 앞서선 안됩니다."),
    INVALID_FIELD_TO_CLEAR(HttpStatus.BAD_REQUEST, "600-5","잘못된 fieldsToClear 값입니다."),

    //601-xx : task 관련 오류
    TASK_NOT_FOUND(HttpStatus.NOT_FOUND, "601-1", "해당 작업이 존재하지 않습니다."),

    //700-xx : 사용자 계정/토큰 관련 오류
    USER_NOT_EXIST(HttpStatus.BAD_REQUEST, "700-1", "존재하지 않는 계정입니다."),
    INVALID_TOKEN(HttpStatus.BAD_REQUEST, "700-2", "유효하지 않은 토큰입니다."),
    EXPIRED_TOKEN(HttpStatus.BAD_REQUEST, "700-3", "만료된 토큰입니다."),

    //701-xx : 사용자 설정 관련 오류
    USER_SETTING_NOT_FOUND(HttpStatus.NOT_FOUND, "701-1", "해당 계정의 설정이 존재하지 않습니다."),
    LABEL_NOT_FOUND(HttpStatus.NOT_FOUND, "701-2", "요청 라벨이 사용자의 라벨 목록에 없습니다."),
    TOO_MANY_LABELS(HttpStatus.BAD_REQUEST, "701-3", "라벨은 최대 3개까지 설정할 수 있습니다."),
    ALREADY_EXIST_REMINDER(HttpStatus.BAD_REQUEST, "701-4", "이미 존재하는 리마인드 프리셋입니다."),
    REMINDER_NOT_FOUND(HttpStatus.NOT_FOUND, "701-5", "요청 리마인드 프리셋이 사용자의 프리셋 목록에 없습니다."),

    //800-xx : 교통 api 관련 오류
    PUBLIC_BUS_API_FAILED(HttpStatus.BAD_REQUEST, "800-1", "공공데이터 API 호출에 실패했습니다."),
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "800-2", "해당 노선은 존재하지 않습니다.");


    private final HttpStatus httpStatus;
    private final String code;
    private final String message;



    ErrorCode(HttpStatus httpStatus, String code, String message) {
        this.httpStatus = httpStatus;
        this.code = code;
        this.message = message;
    }
}
