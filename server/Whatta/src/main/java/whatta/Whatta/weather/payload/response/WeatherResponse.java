package whatta.Whatta.weather.payload.response;

import lombok.Builder;

@Builder
public record WeatherResponse(
        Double todayMinTemperatureC,
        Double todayMaxTemperatureC,
        String todayWeather,
        Integer todayWeatherGroupNumber,
        Double currentTemperatureC,
        Double feelsLikeTemperatureC,
        Double pm25, //초미세먼지 pm2_5
        Double pm10, //미세먼지
        Integer pm25Grade, // 1 좋음, 2 보통, 3 나쁨, 4 매우 나쁨
        Integer pm10Grade, // 1 좋음, 2 보통, 3 나쁨, 4 매우 나쁨
        RainSnowInfo rainSnow
) {

    @Builder
    public record RainSnowInfo(
            boolean willRain,
            int chanceOfRain,
            boolean willSnow,
            int chanceOfSnow,
            String rainStartTime,
            String snowStartTime
    ) {
    }
}
