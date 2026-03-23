package whatta.Whatta.weather.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import whatta.Whatta.global.payload.Response;
import whatta.Whatta.weather.service.WeatherService;

@Tag(name = "Assistant Home Weather", description = "비서홈 날씨 API")
@RestController
@RequestMapping("/api/weather")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
@SecurityRequirement(name = "BearerAuth")
public class WeatherController {

    private final WeatherService weatherService;

    @GetMapping
    @Operation(summary = "비서홈 날씨 조회", description = "현재 위치 좌표를 기준으로 비서홈에 필요한 날씨 정보를 반환합니다.")
    public ResponseEntity<?> getWeather(
            @Parameter(description = "위도", example = "35.13337931893191")
            @RequestParam double latitude,
            @Parameter(description = "경도", example = "129.10550508496985")
            @RequestParam double longitude
    ) {
        return Response.ok(
                "success get assistant home weather",
                weatherService.getWeather(latitude, longitude)
        );
    }
}
