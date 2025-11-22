package whatta.Whatta.global.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.ExpiredJwtException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.payload.Response;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {

        String exceptionCode = (String) request.getAttribute("exception");

        ErrorCode errorCode = ErrorCode.INVALID_TOKEN;

        if (exceptionCode != null) {
            if (exceptionCode.equals(ExpiredJwtException.class.getSimpleName())) {
                errorCode = ErrorCode.EXPIRED_TOKEN;
            }
            else {
                errorCode = ErrorCode.INVALID_TOKEN;
            }
        }
        setResponse(response, errorCode);
    }

    private void setResponse(HttpServletResponse response, ErrorCode errorCode) throws IOException {

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");

        Response<Void> errorResponse = new Response<>(
                errorCode.getCode(),
                errorCode.getMessage(),
                null
        );

        String jsonResult = objectMapper.writeValueAsString(errorResponse);
        response.getWriter().write(jsonResult);


    }
}
