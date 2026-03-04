package whatta.Whatta.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import whatta.Whatta.ai.payload.request.OpenAIRequest;
import whatta.Whatta.ai.spec.ScheduleExtractionSpec;

import java.time.Duration;

@Slf4j
@Component
@RequiredArgsConstructor
public class OpenAIClient {
    private final WebClient openAiWebClient;
    private final ObjectMapper objectMapper;
    private static final int MAX_CONTINUATIONS = 3;
    private static final int MAX_OUTPUT_TOKENS = 1500;

    @Value("${openai.model}")
    private String model;

    @Value("${openai.timeout.seconds}")
    private long timeoutSeconds;

    public String callOpenApi(String input) {
        OpenAIRequest req = OpenAIRequest.builder()
                .model(model)
                .input(input)
                .maxOutputTokens(MAX_OUTPUT_TOKENS)
                .reasoning(new OpenAIRequest.Reasoning(OpenAIRequest.Reasoning.Effort.low))
                .instructions(ScheduleExtractionSpec.INSTRUCTIONS)
                .text(new OpenAIRequest.Text(
                        new OpenAIRequest.Format(
                                "json_schema",
                                ScheduleExtractionSpec.NAME,
                                ScheduleExtractionSpec.schemaNode(objectMapper),
                                true
                        )
                ))
                .store(true)
                .build();

        String rawResponse = requestResponse(req);
        for (int continuation = 0; continuation <= MAX_CONTINUATIONS; continuation++) {
            JsonNode root = parseResponse(rawResponse);

            String extracted = extractOutputText(root);
            if (extracted != null && !extracted.isBlank()) {
                return extracted;
            }

            if (!isMaxTokenIncomplete(root)) {
                log.error("[OPENAI][PARSE_ERROR] text output missing. body={}", abbreviate(rawResponse, 4000));
                throw new IllegalStateException("OpenAI response does not contain text output");
            }

            if (continuation == MAX_CONTINUATIONS) {
                log.error("[OPENAI][INCOMPLETE] max continuations reached. body={}", abbreviate(rawResponse, 4000));
                throw new IllegalStateException("OpenAI response incomplete after continuations");
            }

            String previousResponseId = root.path("id").asText(null);
            if (previousResponseId == null || previousResponseId.isBlank()) {
                log.error("[OPENAI][INCOMPLETE] previous response id missing. body={}", abbreviate(rawResponse, 4000));
                throw new IllegalStateException("OpenAI incomplete response has no id for continuation");
            }

            log.warn("[OPENAI][INCOMPLETE] reason=max_output_tokens. continuation={}/{}", continuation + 1, MAX_CONTINUATIONS);
            rawResponse = requestResponse(
                    OpenAIRequest.builder()
                            .model(model)
                            .input("continue")
                            .maxOutputTokens(MAX_OUTPUT_TOKENS)
                            .previousResponseId(previousResponseId)
                            .store(true)
                            .build()
            );
        }

        throw new IllegalStateException("OpenAI response handling failed");
    }

    private String requestResponse(OpenAIRequest req) {
        try {
            return openAiWebClient.post()
                    .uri("/responses")
                    .bodyValue(req)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .block();
        } catch (WebClientResponseException e) {
            log.error("[OPENAI][ERROR] status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw e;
        }
    }

    private JsonNode parseResponse(String rawResponse) {
        if (rawResponse == null || rawResponse.isBlank()) {
            throw new IllegalStateException("OpenAI response body is empty");
        }

        try {
            return objectMapper.readTree(rawResponse);
        } catch (JsonProcessingException e) {
            log.error("[OPENAI][PARSE_ERROR] invalid json body={}", abbreviate(rawResponse, 4000));
            throw new IllegalStateException("Failed to parse OpenAI response", e);
        }
    }

    private boolean isMaxTokenIncomplete(JsonNode root) {
        return "incomplete".equals(root.path("status").asText())
                && "max_output_tokens".equals(root.path("incomplete_details").path("reason").asText());
    }

    private String extractOutputText(JsonNode root) {
        JsonNode outputParsed = root.path("output_parsed");
        if (!outputParsed.isMissingNode() && !outputParsed.isNull()) {
            try {
                return objectMapper.writeValueAsString(outputParsed);
            } catch (JsonProcessingException e) {
                throw new IllegalStateException("Failed to serialize output_parsed", e);
            }
        }

        JsonNode outputText = root.path("output_text");
        if (outputText.isTextual() && !outputText.asText().isBlank()) {
            return outputText.asText();
        }

        JsonNode output = root.path("output");
        if (output.isArray()) {
            StringBuilder sb = new StringBuilder();
            for (JsonNode item : output) {
                JsonNode content = item.path("content");
                if (!content.isArray()) {
                    continue;
                }
                for (JsonNode c : content) {
                    JsonNode text = c.path("text");
                    if (text.isTextual() && !text.asText().isBlank()) {
                        if (sb.length() > 0) {
                            sb.append('\n');
                        }
                        sb.append(text.asText());
                    }
                }
            }

            if (!sb.isEmpty()) {
                return sb.toString();
            }
        }
        return null;
    }

    private String abbreviate(String text, int maxLen) {
        if (text == null) {
            return null;
        }
        if (text.length() <= maxLen) {
            return text;
        }
        return text.substring(0, maxLen) + "...(truncated)";
    }
}
