package whatta.Whatta.global.exception;

import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import whatta.Whatta.global.payload.Response;

import java.util.Arrays;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Response> handleValidationExceptions(MethodArgumentNotValidException ex){
        String field = ex.getBindingResult().getFieldError().getField();
        String message = ex.getBindingResult().getFieldError().getDefaultMessage();
        String errorMessage = field + " : " + message;

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new Response("BAD_REQUEST", errorMessage, null));
    }

    @ExceptionHandler(RestApiException.class)
    protected ResponseEntity<Response> handleRestApiExceptions(RestApiException ex){
        ErrorCode errorCode = ex.getErrorCode();
        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(new Response(errorCode.getCode(), errorCode.getMessage(), null));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Response> handleJsonParseException(HttpMessageNotReadableException ex) {
        String errorMessage = "요청 본문(JSON) 형식이 잘못되었거나, 데이터 타입이 일치하지 않습니다.";

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new Response("4001", errorMessage, null));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Response> handleMissingParam(MissingServletRequestParameterException ex) {
        String errorMessage = ex.getParameterName() + " 파라미터가 누락되었습니다.";
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new Response("4002", errorMessage, null));
    }

    @ExceptionHandler(TypeMismatchException.class)
    public ResponseEntity<Response> handleTypeMismatch(TypeMismatchException ex) {
        String errorMessage = "파라미터 타입이 올바르지 않습니다: " + ex.getPropertyName();
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new Response("4003", errorMessage, null));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Response> handleHttpMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        String errorMessage = ex.getMethod() + " 메서드는 지원되지 않습니다. 지원되는 메서드: " + Arrays.toString(ex.getSupportedMethods());
        return ResponseEntity
                .status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(new Response("4050", errorMessage, null));
    }
}
