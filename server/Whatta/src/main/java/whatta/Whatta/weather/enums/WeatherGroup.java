package whatta.Whatta.weather.enums;

import lombok.Getter;

import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Getter
public enum WeatherGroup {
    CLEAR(1, Set.of(1000)),
    PARTLY_CLOUDY(2, Set.of(1003, 1006)),
    OVERCAST(3, Set.of(1009)),
    FOG(4, Set.of(1030, 1135, 1147)),
    DRIZZLE(5, Set.of(1072, 1150, 1153, 1168, 1171)),
    LIGHT_RAIN(6, Set.of(1063, 1180, 1183, 1240)),
    MODERATE_RAIN(7, Set.of(1186, 1189, 1243)),
    HEAVY_RAIN(8, Set.of(1192, 1195, 1246)),
    SLEET_OR_FREEZING_RAIN(9, Set.of(1069, 1198, 1201, 1204, 1207, 1249, 1252)),
    ICE_PELLETS(10, Set.of(1237, 1261, 1264)),
    LIGHT_SNOW(11, Set.of(1066, 1114, 1210, 1213, 1255)),
    MODERATE_SNOW(12, Set.of(1216, 1219)),
    HEAVY_SNOW(13, Set.of(1117, 1222, 1225, 1258)),
    THUNDER(14, Set.of(1087, 1273, 1276, 1279, 1282)),
    UNKNOWN(0, Set.of());

    private static final Map<Integer, WeatherGroup> CODE_TO_GROUP = Arrays.stream(values())
            .filter(group -> group != UNKNOWN)
            .flatMap(group -> group.codes.stream().map(code -> Map.entry(code, group)))
            .collect(Collectors.toUnmodifiableMap(Map.Entry::getKey, Map.Entry::getValue));

    private final int groupNumber;
    private final Set<Integer> codes;

    WeatherGroup(int groupNumber, Set<Integer> codes) {
        this.groupNumber = groupNumber;
        this.codes = codes;
    }

    public static WeatherGroup fromCode(Integer code) {
        if (code == null) {
            return UNKNOWN;
        }
        return CODE_TO_GROUP.getOrDefault(code, UNKNOWN);
    }
}
