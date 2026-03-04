package whatta.Whatta.global.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
@Slf4j
public class OpenAIConfig {

    @Bean
    public WebClient openAiWebClient(
            @Value("${openai.base.url}")
            String baseUrl,
            @Value("${openai.api.key}")
            String apiKey
    ) {
        return WebClient.builder()
                .baseUrl(baseUrl + "/v1")
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .build();
    }
}
