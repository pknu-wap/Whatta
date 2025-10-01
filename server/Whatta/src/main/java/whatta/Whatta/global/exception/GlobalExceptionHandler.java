package whatta.Whatta.global.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import whatta.Whatta.global.payload.response.Response;

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
}
