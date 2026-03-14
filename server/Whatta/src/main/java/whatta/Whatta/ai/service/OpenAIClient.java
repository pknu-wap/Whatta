package whatta.Whatta.ai.service;

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
import whatta.Whatta.ai.payload.request.OpenAIRequest;
import whatta.Whatta.ai.payload.response.OpenAIScheduleResponse;
import whatta.Whatta.ai.spec.ScheduleExtractionSpec;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.concurrent.TimeoutException;

@Slf4j
@Component
@RequiredArgsConstructor
public class OpenAIClient {
    private final WebClient openAiWebClient;
    private final ObjectMapper objectMapper;
    private static final int MAX_OUTPUT_TOKENS = 1500;

    @Value("${openai.model}")
    private String model;

    @Value("${openai.timeout.seconds}")
    private long timeoutSeconds;

    public OpenAIScheduleResponse callOpenApi(String input) {
        long totalStartNanos = System.nanoTime();
        LocalDateTime nowKst = LocalDateTime.now(ScheduleExtractionSpec.KST_ZONE_ID);

        long buildRequestStartNanos = System.nanoTime();
        OpenAIRequest req = OpenAIRequest.builder()
                .model(model)
                .input(input)
                .maxOutputTokens(MAX_OUTPUT_TOKENS)
                .reasoning(new OpenAIRequest.Reasoning(OpenAIRequest.Reasoning.Effort.low))
                .instructions(ScheduleExtractionSpec.instructions(nowKst))
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
        log.info("[OPENAI][TIMING] stage=build_request duration_ms={} input_chars={} model={}",
                elapsedMillis(buildRequestStartNanos),
                input == null ? 0 : input.length(),
                model);

        long requestStartNanos = System.nanoTime();
        String rawResponse = requestResponse(req);
        log.info("[OPENAI][TIMING] stage=request_response duration_ms={} response_chars={}",
                elapsedMillis(requestStartNanos),
                rawResponse == null ? 0 : rawResponse.length());

        long parseStartNanos = System.nanoTime();
        JsonNode root = parseResponse(rawResponse);
        log.info("[OPENAI][TIMING] stage=parse_response duration_ms={}", elapsedMillis(parseStartNanos));

        long extractStartNanos = System.nanoTime();
        OpenAIScheduleResponse extracted = extractOutput(root);
        log.info("[OPENAI][TIMING] stage=extract_output duration_ms={}", elapsedMillis(extractStartNanos));
        if (extracted == null) {
            log.error("[OPENAI][PARSE_ERROR] text output missing. responseId={}, status={}",
                    root.path("id").asText("-"),
                    root.path("status").asText("-"));
            throw new IllegalStateException("OpenAI response does not contain text output");
        }

        log.info("[OPENAI][TIMING] stage=call_openapi_total duration_ms={} response_id={} status={}",
                elapsedMillis(totalStartNanos),
                root.path("id").asText("-"),
                root.path("status").asText("-"));
        return extracted;
    }

    private String requestResponse(OpenAIRequest req) {
        long httpStartNanos = System.nanoTime();
        try {
            String rawResponse = openAiWebClient.post()
                    .uri("/responses")
                    .bodyValue(req)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .block();
            log.info("[OPENAI][TIMING] stage=http_post duration_ms={} timeout_seconds={}",
                    elapsedMillis(httpStartNanos),
                    timeoutSeconds);

            long usageStartNanos = System.nanoTime();
            printUsageToStdOut(rawResponse, req);
            log.info("[OPENAI][TIMING] stage=print_usage duration_ms={}", elapsedMillis(usageStartNanos));
            return rawResponse;
        } catch (WebClientResponseException e) {
            log.error("[OPENAI][ERROR] type=http status={} duration_ms={} body={}",
                    e.getStatusCode(),
                    elapsedMillis(httpStartNanos),
                    e.getResponseBodyAsString(),
                    e);
            throw new RestApiException(ErrorCode.OPENAI_API_FAILED);
        } catch (WebClientRequestException e) {
            if (isTimeout(e)) {
                log.error("[OPENAI][ERROR] type=timeout duration_ms={} message={}",
                        elapsedMillis(httpStartNanos),
                        rootMessage(e),
                        e);
                throw new RestApiException(ErrorCode.OPENAI_API_TIMEOUT);
            }
            log.error("[OPENAI][ERROR] type=network duration_ms={} message={}",
                    elapsedMillis(httpStartNanos),
                    rootMessage(e),
                    e);
            throw new RestApiException(ErrorCode.OPENAI_API_FAILED);
        } catch (Exception e) {
            if (isTimeout(e)) {
                log.error("[OPENAI][ERROR] type=timeout duration_ms={} message={}",
                        elapsedMillis(httpStartNanos),
                        rootMessage(e),
                        e);
                throw new RestApiException(ErrorCode.OPENAI_API_TIMEOUT);
            }
            log.error("[OPENAI][ERROR] type=unexpected duration_ms={} message={}",
                    elapsedMillis(httpStartNanos),
                    rootMessage(e),
                    e);
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
        return root == null ? "" : root.getMessage();
    }

    private void printUsageToStdOut(String rawResponse, OpenAIRequest req) {
        if (rawResponse == null || rawResponse.isBlank()) {
            System.out.println("[OPENAI][TOKENS] usage unavailable (empty response body)");
            return;
        }

        try {
            JsonNode root = objectMapper.readTree(rawResponse);
            JsonNode usage = root.path("usage");
            String responseId = root.path("id").asText("-");
            String status = root.path("status").asText("-");

            int inputTokens = usage.path("input_tokens").asInt(-1);
            int outputTokens = usage.path("output_tokens").asInt(-1);
            int totalTokens = usage.path("total_tokens").asInt(-1);
            int cachedInputTokens = usage.path("input_tokens_details").path("cached_tokens").asInt(-1);
            int reasoningTokens = usage.path("output_tokens_details").path("reasoning_tokens").asInt(-1);

            String requestModel = req != null && req.model() != null ? req.model() : "-";
            String reasoningEffort = req != null && req.reasoning() != null && req.reasoning().effort() != null
                    ? req.reasoning().effort().name()
                    : "-";

            System.out.println(
                    String.format(
                            "[OPENAI][TOKENS] responseId=%s status=%s model=%s reasoning=%s input=%d output=%d total=%d cached_input=%d reasoning_output=%d",
                            responseId,
                            status,
                            requestModel,
                            reasoningEffort,
                            inputTokens,
                            outputTokens,
                            totalTokens,
                            cachedInputTokens,
                            reasoningTokens
                    )
            );
        } catch (JsonProcessingException e) {
            System.out.println("[OPENAI][TOKENS] usage unavailable (response parse failed)");
        }
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

    private OpenAIScheduleResponse extractOutput(JsonNode root) {
        JsonNode outputParsed = root.path("output_parsed");
        if (!outputParsed.isMissingNode() && !outputParsed.isNull()) {
            try {
                log.info("[OPENAI][TIMING] stage=extract_output_parsed source=output_parsed");
                return objectMapper.treeToValue(outputParsed, OpenAIScheduleResponse.class);
            } catch (JsonProcessingException e) {
                throw new IllegalStateException("Failed to deserialize output_parsed", e);
            }
        }

        long extractTextStartNanos = System.nanoTime();
        String outputText = extractOutputText(root);
        log.info("[OPENAI][TIMING] stage=extract_output_text duration_ms={} output_text_chars={}",
                elapsedMillis(extractTextStartNanos),
                outputText == null ? 0 : outputText.length());
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

            if (!sb.isEmpty()) {
                return sb.toString();
            }
        }
        return null;
    }

    private long elapsedMillis(long startNanos) {
        return Duration.ofNanos(System.nanoTime() - startNanos).toMillis();
    }
}
