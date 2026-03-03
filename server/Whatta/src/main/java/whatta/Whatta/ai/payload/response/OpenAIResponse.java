package whatta.Whatta.ai.payload.response;

import com.fasterxml.jackson.annotation.JsonProperty;

public record OpenAIResponse(
        @JsonProperty("output_text")
        String outputText
) {
}
