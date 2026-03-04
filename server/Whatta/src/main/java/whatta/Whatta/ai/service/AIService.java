package whatta.Whatta.ai.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class AIService {

    private final OpenAIClient openAIClient;

    public String postInput(String userId, String input) {
        return openAIClient.callOpenApi(input);
    }


}
