package whatta.Whatta.agent.payload.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.Builder;

@Builder
public record OpenAIRequest(
        String model,
        Object input,
        @JsonProperty("max_output_tokens")
        Integer maxOutputTokens,
        Reasoning reasoning,
        String instructions,
        Text text,
        @JsonProperty("previous_response_id")
        String previousResponseId,
        Boolean store
) {
    public record InputMessage(
            String role,
            String type,
            java.util.List<InputContent> content
    ) {}

    public sealed interface InputContent permits InputTextContent, InputImageContent {
    }

    public record InputTextContent(
            String type,
            String text
    ) implements InputContent {}

    public record InputImageContent(
            String type,
            String image_url,
            String detail
    ) implements InputContent {}

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
            minimal,
            low,
            medium,
            high
        }
    }
}
