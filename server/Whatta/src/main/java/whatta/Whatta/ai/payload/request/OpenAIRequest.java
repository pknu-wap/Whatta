package whatta.Whatta.ai.payload.request;

import com.fasterxml.jackson.annotation.JsonProperty;

public record OpenAIRequest(
        String model,
        String input,
        @JsonProperty("max_output_tokens")
        Integer maxOutputTokens,
        Reasoning reasoning
) {
    public enum Reasoning {
        low,
        medium,
        high
    }
}
