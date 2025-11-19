package whatta.Whatta.traffic.payload.request;

import jakarta.validation.constraints.NotBlank;

public record BusItemCreateRequest(
        @NotBlank
        String busStationId,

        @NotBlank
        String busStationName,

        @NotBlank
        String busRouteId,

        @NotBlank
        String busRouteNo
) {}
