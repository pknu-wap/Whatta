package whatta.Whatta.agent.service.extractor;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import whatta.Whatta.agent.service.OpenAIClient;

@Component
@RequiredArgsConstructor
public class LLMExtractor {

    private final OpenAIClient openAIClient;

    public OpenAIClient.OpenAIExecutionResult extractTextOnly(String input) {
        return openAIClient.callTextOnly(input);
    }

    public OpenAIClient.OpenAIExecutionResult extractWithImage(String inputText, String imageUrl, String detail) {
        return openAIClient.callTextWithImage(inputText, imageUrl, detail);
    }
}
