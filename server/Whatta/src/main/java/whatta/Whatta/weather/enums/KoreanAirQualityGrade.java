package whatta.Whatta.weather.enums;

public enum KoreanAirQualityGrade {
    UNKNOWN(0),
    GOOD(1),
    MODERATE(2),
    BAD(3),
    VERY_BAD(4);

    private final int code;

    KoreanAirQualityGrade(int code) {
        this.code = code;
    }

    public int getCode() {
        return code;
    }

    public static KoreanAirQualityGrade fromPm10(Double pm10) {
        if (pm10 == null) {
            return UNKNOWN;
        }
        if (pm10 <= 30) {
            return GOOD;
        }
        if (pm10 <= 80) {
            return MODERATE;
        }
        if (pm10 <= 150) {
            return BAD;
        }
        return VERY_BAD;
    }

    public static KoreanAirQualityGrade fromPm25(Double pm25) {
        if (pm25 == null) {
            return UNKNOWN;
        }
        if (pm25 <= 15) {
            return GOOD;
        }
        if (pm25 <= 35) {
            return MODERATE;
        }
        if (pm25 <= 75) {
            return BAD;
        }
        return VERY_BAD;
    }
}
