package whatta.Whatta.ai.payload.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.Builder;

@Builder
public record OpenAIRequest(
        String model,
        String input,
        @JsonProperty("max_output_tokens")
        Integer maxOutputTokens,
        Reasoning reasoning,
        String instructions,
        Text text,
        @JsonProperty("previous_response_id")
        String previousResponseId,
        Boolean store
) {
    public record Text(
            Format format
    ) {}

    public record Format(
            String type,
            String name,
            JsonNode schema,
            Boolean strict
    ) {}

    public record Reasoning(
            Effort effort
    ) {
        public enum Effort {
            low,
            medium,
            high
        }
    }
}
