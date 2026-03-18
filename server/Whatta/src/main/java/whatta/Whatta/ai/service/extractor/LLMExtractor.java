package whatta.Whatta.ai.service.extractor;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import whatta.Whatta.ai.payload.response.OpenAIScheduleResponse;
import whatta.Whatta.ai.service.OpenAIClient;

@Component
@RequiredArgsConstructor
public class LLMExtractor {

    private final OpenAIClient openAIClient;

    public OpenAIScheduleResponse extract(String input) {
        return openAIClient.callOpenApi(input);
    }
}
