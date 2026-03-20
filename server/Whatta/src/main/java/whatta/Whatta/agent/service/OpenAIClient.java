package whatta.Whatta.agent.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import whatta.Whatta.agent.payload.request.OpenAIRequest;
import whatta.Whatta.agent.payload.response.OpenAIScheduleResponse;
import whatta.Whatta.agent.spec.ScheduleExtractionSpec;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.TimeoutException;

@Slf4j
@Component
@RequiredArgsConstructor
public class OpenAIClient {
    private static final int MAX_LOG_VALUE_LENGTH = 200;
    private final WebClient openAiWebClient;
    private final ObjectMapper objectMapper;
    private static final int MAX_OUTPUT_TOKENS = 700;

    @Value("${openai.model}")
    private String model;

    @Value("${openai.timeout.seconds}")
    private long timeoutSeconds;

    public OpenAIExecutionResult callTextOnly(String input) {
        return callOpenApi(input);
    }

    public OpenAIExecutionResult callTextWithImage(String inputText, String imageUrl, String detail) {
        List<OpenAIRequest.InputContent> content = inputText == null || inputText.isBlank()
                ? List.of(
                new OpenAIRequest.InputImageContent("input_image", imageUrl, detail)
        )
                : List.of(
                new OpenAIRequest.InputTextContent("input_text", inputText),
                new OpenAIRequest.InputImageContent("input_image", imageUrl, detail)
        );
        List<OpenAIRequest.InputMessage> input = List.of(
                new OpenAIRequest.InputMessage("user", "message", content)
        );
        return callOpenApi(input);
    }

    private OpenAIExecutionResult callOpenApi(Object input) {
        OpenAIRequest req = OpenAIRequest.builder()
                .model(model)
                .input(input)
                .maxOutputTokens(MAX_OUTPUT_TOKENS)
                .reasoning(new OpenAIRequest.Reasoning(OpenAIRequest.Reasoning.Effort.low))
                .instructions(ScheduleExtractionSpec.instructions())
                .text(new OpenAIRequest.Text(
                        new OpenAIRequest.Format(
                                "json_schema",
                                ScheduleExtractionSpec.NAME,
                                ScheduleExtractionSpec.schemaNode(objectMapper),
                                true
                        )
                ))
                .store(false)
                .build();

        long startedAt = System.nanoTime();
        String rawResponse = requestResponse(req);
        long latencyMs = Duration.ofNanos(System.nanoTime() - startedAt).toMillis();
        JsonNode root = parseResponse(rawResponse);
        Usage usage = extractUsage(root);
        printUsageToStdOut(root, req, latencyMs, usage);
        OpenAIScheduleResponse extracted = extractOutput(root);
        if (extracted == null) {
            log.error("[OPENAI][PARSE_ERROR] text output missing. responseId={}, status={}",
                    root.path("id").asText("-"),
                    root.path("status").asText("-"));
            throw new IllegalStateException("OpenAI response does not contain text output");
        }
        return new OpenAIExecutionResult(
                extracted,
                usage,
                root.path("id").asText("-"),
                root.path("status").asText("-"),
                root.path("model").asText(model),
                latencyMs
        );
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
            String responseBody = e.getResponseBodyAsString();
            log.error("[OPENAI][ERROR] type=http status={} requestId={} errorType={} errorCode={} errorMessage={}",
                    e.getStatusCode().value(),
                    sanitizeLogValue(e.getHeaders().getFirst("x-request-id")),
                    extractErrorField(responseBody, "type"),
                    extractErrorField(responseBody, "code"),
                    extractErrorField(responseBody, "message"),
                    e);
            throw new RestApiException(ErrorCode.OPENAI_API_FAILED);
        } catch (WebClientRequestException e) {
            if (isTimeout(e)) {
                log.error("[OPENAI][ERROR] type=timeout message={}", rootMessage(e), e);
                throw new RestApiException(ErrorCode.OPENAI_API_TIMEOUT);
            }
            log.error("[OPENAI][ERROR] type=network message={}", rootMessage(e), e);
            throw new RestApiException(ErrorCode.OPENAI_API_FAILED);
        } catch (Exception e) {
            if (isTimeout(e)) {
                log.error("[OPENAI][ERROR] type=timeout message={}", rootMessage(e), e);
                throw new RestApiException(ErrorCode.OPENAI_API_TIMEOUT);
            }
            log.error("[OPENAI][ERROR] type=unexpected message={}", rootMessage(e), e);
            throw new RestApiException(ErrorCode.OPENAI_API_FAILED);
        }
    }

    private boolean isTimeout(Throwable throwable) {
        Throwable cursor = throwable;
        while (cursor != null) {
            if (cursor instanceof TimeoutException) {
                return true;
            }
            cursor = cursor.getCause();
        }
        return false;
    }

    private String rootMessage(Throwable throwable) {
        Throwable cursor = throwable;
        Throwable root = throwable;
        while (cursor != null) {
            root = cursor;
            cursor = cursor.getCause();
        }
        return root == null ? "" : sanitizeLogValue(root.getMessage());
    }

    private void printUsageToStdOut(JsonNode root, OpenAIRequest req, long latencyMs, Usage usage) {
        String requestModel = req != null && req.model() != null ? req.model() : "-";
        String reasoningEffort = req != null && req.reasoning() != null && req.reasoning().effort() != null
                ? req.reasoning().effort().name()
                : "-";

        System.out.println(
                String.format(
                        "[OPENAI][TOKENS] responseId=%s status=%s model=%s reasoning=%s latency_ms=%d input=%d output=%d total=%d cached_input=%d reasoning_output=%d",
                        root.path("id").asText("-"),
                        root.path("status").asText("-"),
                        requestModel,
                        reasoningEffort,
                        latencyMs,
                        usage.inputTokens(),
                        usage.outputTokens(),
                        usage.totalTokens(),
                        usage.cachedInputTokens(),
                        usage.reasoningTokens()
                )
        );
    }

    private JsonNode parseResponse(String rawResponse) {
        if (rawResponse == null || rawResponse.isBlank()) {
            throw new IllegalStateException("OpenAI response body is empty");
        }

        try {
            return objectMapper.readTree(rawResponse);
        } catch (JsonProcessingException e) {
            log.error("[OPENAI][PARSE_ERROR] invalid json response");
            throw new IllegalStateException("Failed to parse OpenAI response", e);
        }
    }

    private Usage extractUsage(JsonNode root) {
        JsonNode usage = root.path("usage");
        return new Usage(
                usage.path("input_tokens").asInt(-1),
                usage.path("output_tokens").asInt(-1),
                usage.path("total_tokens").asInt(-1),
                usage.path("input_tokens_details").path("cached_tokens").asInt(-1),
                usage.path("output_tokens_details").path("reasoning_tokens").asInt(-1)
        );
    }

    private OpenAIScheduleResponse extractOutput(JsonNode root) {
        JsonNode outputParsed = root.path("output_parsed");
        if (!outputParsed.isMissingNode() && !outputParsed.isNull()) {
            try {
                return objectMapper.treeToValue(outputParsed, OpenAIScheduleResponse.class);
            } catch (JsonProcessingException e) {
                throw new IllegalStateException("Failed to deserialize output_parsed", e);
            }
        }

        String outputText = extractOutputText(root);
        if (outputText == null || outputText.isBlank()) {
            return null;
        }

        try {
            return objectMapper.readValue(outputText, OpenAIScheduleResponse.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to deserialize output_text", e);
        }
    }

    private String extractOutputText(JsonNode root) {
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
                        sb.append(text.asText());
                    }
                }
            }

            if (sb.length() > 0) {
                return sb.toString();
            }
        }
        return null;
    }

    private String extractErrorField(String responseBody, String fieldName) {
        if (responseBody == null || responseBody.isBlank()) {
            return "-";
        }

        try {
            JsonNode errorNode = objectMapper.readTree(responseBody).path("error");
            return sanitizeLogValue(errorNode.path(fieldName).asText("-"));
        } catch (JsonProcessingException e) {
            return "-";
        }
    }

    private String sanitizeLogValue(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }

        String sanitized = value.replaceAll("\\s+", " ").trim();
        if (sanitized.length() <= MAX_LOG_VALUE_LENGTH) {
            return sanitized;
        }
        return sanitized.substring(0, MAX_LOG_VALUE_LENGTH) + "...";
    }

    public record Usage(
            int inputTokens,
            int outputTokens,
            int totalTokens,
            int cachedInputTokens,
            int reasoningTokens
    ) {
    }

    public record OpenAIExecutionResult(
            OpenAIScheduleResponse response,
            Usage usage,
            String responseId,
            String status,
            String model,
            long latencyMs
    ) {
    }
}
