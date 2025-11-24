package whatta.Whatta.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    EVENT_NOT_FOUND(HttpStatus.NOT_FOUND, "600", "해당 일정이 존재하지 않습니다."),
    REQUIRED_DATE_MISSING(HttpStatus.BAD_REQUEST, "601", "일정은 날짜 지정이 필수입니다."),
    DATE_ORDER_INVALID(HttpStatus.BAD_REQUEST, "602", "끝나는 날짜가 시작 날짜보다 앞서선 안됩니다."),
    TIME_ORDER_INVALID(HttpStatus.BAD_REQUEST, "602", "끝나는 시간이 시작 시간보다 앞서선 안됩니다."),

    TASK_NOT_FOUND(HttpStatus.NOT_FOUND, "700", "해당 작업이 존재하지 않습니다."),
    PUBLIC_API_FAILED(HttpStatus.BAD_REQUEST, "701", "API 호출 실패했습니다."),

    USER_NOT_EXIST(HttpStatus.BAD_REQUEST, "800", "존재하지 않는 계정입니다."),
    USER_SETTING_NOT_FOUND(HttpStatus.NOT_FOUND, "801", "해당 계정의 설정이 존재하지 않습니다."),
    INVALID_TOKEN(HttpStatus.BAD_REQUEST, "802", "유효하지 않은 토큰입니다."),
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "803", "해당 노선은 존재하지 않습니다."),
    FORBIDDEN_ACCESS(HttpStatus.BAD_REQUEST, "804", "일치하지 않은 계정입니다."),

    LABEL_NOT_FOUND(HttpStatus.NOT_FOUND, "900", "요청 라벨이 사용자의 라벨 목록에 없습니다."),
    TOO_MANY_LABELS(HttpStatus.BAD_REQUEST, "901", "라벨은 최대 3개까지 설정할 수 있습니다."),
    ALREADY_EXIST_REMINDER(HttpStatus.BAD_REQUEST, "902", "이미 존재하는 리마인드 프리셋입니다."),
    REMINDER_NOT_FOUND(HttpStatus.NOT_FOUND, "903", "요청 리마인드 프리셋이 사용자의 프리셋 목록에 없습니다.");



    private final HttpStatus httpStatus;
    private final String code;
    private final String message;



    ErrorCode(HttpStatus httpStatus, String code, String message) {
        this.httpStatus = httpStatus;
        this.code = code;
        this.message = message;
    }
}
