package whatta.Whatta.ai.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.ai.payload.request.OpenAIRequest;
import whatta.Whatta.ai.payload.response.OpenAIResponse;

@Service
@AllArgsConstructor
public class AIService {

    private final OpenAIClient openAIClient;

    public OpenAIResponse requestInput(String userId, String input) {
        OpenAIResponse response = openAIClient.callOpenApi(input);


        return response;
    }


}
