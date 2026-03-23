package whatta.Whatta.weather.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.weather.client.WeatherApiClient;
import whatta.Whatta.weather.client.dto.WeatherApiForecastResponse;
import whatta.Whatta.weather.enums.KoreanAirQualityGrade;
import whatta.Whatta.weather.enums.WeatherGroup;
import whatta.Whatta.weather.payload.response.WeatherResponse;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WeatherService {

    private static final DateTimeFormatter WEATHER_API_TIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final WeatherApiClient weatherApiClient;

    public WeatherResponse getWeather(double latitude, double longitude) {
        WeatherApiForecastResponse response = weatherApiClient.getTodayWeather(latitude, longitude);

        WeatherApiForecastResponse.Current current = response.current();
        WeatherApiForecastResponse.ForecastDay todayForecast = extractTodayForecast(response);
        WeatherApiForecastResponse.Day today = todayForecast.day();

        if (current == null || today == null || today.condition() == null) {
            throw new RestApiException(ErrorCode.WEATHER_API_INVALID_RESPONSE);
        }

        WeatherApiForecastResponse.Condition condition = today.condition();
        WeatherApiForecastResponse.AirQuality airQuality = current.airQuality();
        WeatherGroup weatherGroup = WeatherGroup.fromCode(condition.code());
        WeatherApiForecastResponse.Hour firstRainHour = findFirstRainHour(todayForecast.hour());
        WeatherApiForecastResponse.Hour firstSnowHour = findFirstSnowHour(todayForecast.hour());

        return WeatherResponse.builder()
                .todayMinTemperatureC(today.minTempC())
                .todayMaxTemperatureC(today.maxTempC())
                .todayWeather(condition.text())
                .todayWeatherGroupNumber(weatherGroup.getGroupNumber())
                .currentTemperatureC(current.tempC())
                .feelsLikeTemperatureC(current.feelsLikeC())
                .pm25(airQuality != null ? airQuality.pm25() : null)
                .pm10(airQuality != null ? airQuality.pm10() : null)
                .pm25Grade(KoreanAirQualityGrade.fromPm25(airQuality != null ? airQuality.pm25() : null).getCode())
                .pm10Grade(KoreanAirQualityGrade.fromPm10(airQuality != null ? airQuality.pm10() : null).getCode())
                .rainSnow(WeatherResponse.RainSnowInfo.builder()
                        .willRain(toBoolean(today.dailyWillItRain()))
                        .chanceOfRain(defaultZero(today.dailyChanceOfRain()))
                        .willSnow(toBoolean(today.dailyWillItSnow()))
                        .chanceOfSnow(defaultZero(today.dailyChanceOfSnow()))
                        .rainStartTime(firstRainHour != null ? firstRainHour.time() : null)
                        .snowStartTime(firstSnowHour != null ? firstSnowHour.time() : null)
                        .build())
                .build();
    }

    private WeatherApiForecastResponse.ForecastDay extractTodayForecast(WeatherApiForecastResponse response) {
        WeatherApiForecastResponse.Forecast forecast = response.forecast();
        if (forecast == null) {
            throw new RestApiException(ErrorCode.WEATHER_API_INVALID_RESPONSE);
        }

        List<WeatherApiForecastResponse.ForecastDay> forecastDays = forecast.forecastday();
        if (forecastDays == null || forecastDays.isEmpty() || forecastDays.get(0) == null) {
            throw new RestApiException(ErrorCode.WEATHER_API_INVALID_RESPONSE);
        }

        return forecastDays.get(0);
    }

    private boolean toBoolean(Integer value) {
        return value != null && value == 1;
    }

    private int defaultZero(Integer value) {
        return value != null ? value : 0;
    }

    private WeatherApiForecastResponse.Hour findFirstRainHour(List<WeatherApiForecastResponse.Hour> hours) {
        if (hours == null) {
            return null;
        }

        LocalDateTime now = LocalDateTime.now();

        return hours.stream()
                .filter(hour -> isAfterOrSameCurrentHour(hour.time(), now))
                .filter(hour -> toBoolean(hour.willItRain()))
                .findFirst()
                .orElse(null);
    }

    private WeatherApiForecastResponse.Hour findFirstSnowHour(List<WeatherApiForecastResponse.Hour> hours) {
        if (hours == null) {
            return null;
        }

        LocalDateTime now = LocalDateTime.now();

        return hours.stream()
                .filter(hour -> isAfterOrSameCurrentHour(hour.time(), now))
                .filter(hour -> toBoolean(hour.willItSnow()))
                .findFirst()
                .orElse(null);
    }

    private boolean isAfterOrSameCurrentHour(String weatherApiTime, LocalDateTime now) {
        if (weatherApiTime == null) {
            return false;
        }

        LocalDateTime forecastTime = LocalDateTime.parse(weatherApiTime, WEATHER_API_TIME_FORMAT);
        return !forecastTime.isBefore(now.withMinute(0).withSecond(0).withNano(0));
    }
}
