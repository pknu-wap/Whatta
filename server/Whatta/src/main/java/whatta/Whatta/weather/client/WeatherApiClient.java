package whatta.Whatta.weather.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.weather.client.dto.WeatherApiForecastResponse;

import java.net.URI;
import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class WeatherApiClient {

    private final RestTemplate restTemplate;

    @Value("${weather.api.base-url:https://api.weatherapi.com/v1}")
    private String baseUrl;

    @Value("${weather.api.key:}")
    private String apiKey;

    public WeatherApiForecastResponse getTodayWeather(double latitude, double longitude) {
        if (!StringUtils.hasText(apiKey)) {
            throw new RestApiException(ErrorCode.WEATHER_API_KEY_MISSING);
        }

        LocalDateTime today = LocalDateTime.now();
        URI uri = UriComponentsBuilder
                .fromUriString(baseUrl)
                .path("/forecast.json")
                .queryParam("q", latitude + "," + longitude)
                .queryParam("days", 1)
                .queryParam("dt", today.toLocalDate().toString())
                .queryParam("hour", String.valueOf(today.getHour()))
                .queryParam("lang", "ko")
                .queryParam("alerts", "no")
                .queryParam("aqi", "yes")
                .queryParam("key", apiKey)
                .build(true)
                .toUri();

        WeatherApiForecastResponse response;
        try {
            response = restTemplate.getForObject(uri, WeatherApiForecastResponse.class);

        } catch (RestClientException exception) {
            log.error("WeatherAPI 호출 실패: message={}", exception.getMessage());
            throw new RestApiException(ErrorCode.WEATHER_API_FAILED);
        }

        if (response == null) {
            throw new RestApiException(ErrorCode.WEATHER_API_FAILED);
        }

        return response;
    }
}
