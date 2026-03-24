package whatta.Whatta.weather.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record WeatherApiForecastResponse(
        Location location,
        Current current,
        Forecast forecast
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Location(
            @JsonProperty("name")
            String name,
            @JsonProperty("country")
            String country
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Current(
            @JsonProperty("temp_c")
            Double tempC,
            @JsonProperty("feelslike_c")
            Double feelsLikeC,
            @JsonProperty("air_quality")
            AirQuality airQuality
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Forecast(
            List<ForecastDay> forecastday
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ForecastDay(
            Day day,
            List<Hour> hour
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Day(
            @JsonProperty("maxtemp_c")
            Double maxTempC,
            @JsonProperty("mintemp_c")
            Double minTempC,
            @JsonProperty("daily_will_it_rain")
            Integer dailyWillItRain,
            @JsonProperty("daily_chance_of_rain")
            Integer dailyChanceOfRain,
            @JsonProperty("daily_will_it_snow")
            Integer dailyWillItSnow,
            @JsonProperty("daily_chance_of_snow")
            Integer dailyChanceOfSnow,
            Condition condition
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Condition(
            String text,
            Integer code
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AirQuality(
            @JsonProperty("pm2_5")
            Double pm25,
            Double pm10,
            @JsonProperty("us-epa-index")
            Integer usEpaIndex
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Hour(
            String time,
            @JsonProperty("will_it_rain")
            Integer willItRain,
            @JsonProperty("chance_of_rain")
            Integer chanceOfRain,
            @JsonProperty("will_it_snow")
            Integer willItSnow,
            @JsonProperty("chance_of_snow")
            Integer chanceOfSnow
    ) {
    }
}
