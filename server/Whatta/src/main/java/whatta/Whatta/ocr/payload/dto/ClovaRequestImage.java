package whatta.Whatta.ocr.payload.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;

@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ClovaRequestImage(
        String format,
        String name,
        String url,
        String data
) {
}
