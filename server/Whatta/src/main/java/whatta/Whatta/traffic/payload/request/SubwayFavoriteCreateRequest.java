package whatta.Whatta.traffic.payload.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record SubwayFavoriteCreateRequest(
        @NotBlank
        String subwayStationId,

        @NotBlank
        String subwayStationName,

        @NotBlank
        String subwayRouteName,

        @NotBlank
        @Pattern(regexp = "U|D")
        String upDownTypeCode
) {}
