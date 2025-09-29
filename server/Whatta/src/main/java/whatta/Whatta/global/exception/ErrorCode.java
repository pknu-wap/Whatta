package whatta.Whatta.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    EVENT_NOT_FOUNT(HttpStatus.NOT_FOUND, "600", "해당 일정이 존재하지 않습니다."),
    REQUIRED_DATE_MISSING(HttpStatus.BAD_REQUEST, "601", "일정은 날짜 지정이 필수입니다."),

    USER_NOT_EXIST(HttpStatus.BAD_REQUEST, "800", "존재하지 않는 계정입니다."),

    LABEL_NOT_FOUND(HttpStatus.BAD_REQUEST, "900", "요청 라벨이 사용자의 라벨 목록에 없습니다.");



    private final HttpStatus httpStatus;
    private final String code;
    private final String message;



    ErrorCode(HttpStatus httpStatus, String code, String message) {
        this.httpStatus = httpStatus;
        this.code = code;
        this.message = message;
    }
}
