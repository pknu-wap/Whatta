package whatta.Whatta.traffic.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import whatta.Whatta.traffic.client.subway.SubwayApiClient;
import whatta.Whatta.traffic.client.subway.dto.SubwayApiItem;
import whatta.Whatta.traffic.client.subway.dto.SubwayApiResponse;
import whatta.Whatta.traffic.payload.response.SubwayScheduleResponse;
import whatta.Whatta.traffic.payload.response.SubwayStationResponse;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubwayService {

    private final SubwayApiClient subwayApiClient;

    public List<SubwayStationResponse> searchStationsByName(String keyword) {
        SubwayApiResponse rawResponse = subwayApiClient.getStationList(keyword);

        if (isInvalidResponse(rawResponse)) {
            return Collections.emptyList();
        }

        return rawResponse.getBody().getItems().getItem().stream()
                .map(this::parseToStationResponse)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    public Optional<SubwayScheduleResponse> findNextTrain(String subwayStationId, String upDownTypeCode, LocalDateTime now) {
        String dailyTypeCode = resolveDailyTypeCode(now.getDayOfWeek());
        SubwayApiResponse rawResponse = subwayApiClient.getScheduleList(subwayStationId, dailyTypeCode, upDownTypeCode);

        if (isInvalidResponse(rawResponse)) {
            return Optional.empty();
        }

        int currentComparableTime = currentComparableTime(now);

        return rawResponse.getBody().getItems().getItem().stream()
                .map(this::parseToScheduleCandidate)
                .filter(Objects::nonNull)
                .filter(candidate -> candidate.comparableTime() >= currentComparableTime)
                .min(Comparator.comparingInt(SubwayScheduleCandidate::comparableTime))
                .map(SubwayScheduleCandidate::response);
    }

    public String resolveDailyTypeCode(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case SATURDAY -> "02";
            case SUNDAY -> "03";
            default -> "01";
        };
    }

    private SubwayStationResponse parseToStationResponse(SubwayApiItem item) {
        if (item.getSubwayStationId() == null || item.getSubwayStationName() == null) {
            return null;
        }

        return new SubwayStationResponse(
                item.getSubwayStationId(),
                item.getSubwayStationName(),
                item.getSubwayRouteName()
        );
    }

    private SubwayScheduleCandidate parseToScheduleCandidate(SubwayApiItem item) {
        ParsedScheduleTime arrivalTime = parseScheduleTime(item.getArrTime());
        ParsedScheduleTime departureTime = parseScheduleTime(item.getDepTime());
        ParsedScheduleTime primaryScheduleTime = resolvePrimaryScheduleTime(arrivalTime, departureTime);

        if (primaryScheduleTime == null) {
            log.warn("지하철 시간표 파싱 실패: {}", item.getSubwayStationId());
            return null;
        }

        SubwayScheduleResponse response = new SubwayScheduleResponse(
                item.getSubwayRouteId(),
                item.getSubwayStationId(),
                resolveStationName(item),
                item.getDailyTypeCode(),
                item.getUpDownTypeCode(),
                resolveDisplayTime(departureTime),
                resolveDisplayTime(arrivalTime),
                item.getEndSubwayStationId(),
                item.getEndSubwayStationNm()
        );

        return new SubwayScheduleCandidate(response, primaryScheduleTime.comparableTime());
    }

    private boolean isInvalidResponse(SubwayApiResponse response) {
        return response == null
                || response.getBody() == null
                || response.getBody().getItems() == null
                || response.getBody().getItems().getItem() == null;
    }

    private String resolveStationName(SubwayApiItem item) {
        if (item.getSubwayStationNm() != null && !item.getSubwayStationNm().isBlank()) {
            return item.getSubwayStationNm();
        }
        return item.getSubwayStationName();
    }

    private ParsedScheduleTime parseScheduleTime(String rawTime) {
        if (rawTime == null || rawTime.isBlank()) {
            return null;
        }

        String digitsOnly = rawTime.chars()
                .filter(Character::isDigit)
                .collect(StringBuilder::new, StringBuilder::appendCodePoint, StringBuilder::append)
                .toString();

        if (digitsOnly.length() < 5 || digitsOnly.length() > 6) {
            return null;
        }

        String padded = String.format("%6s", digitsOnly).replace(' ', '0');

        int hour = Integer.parseInt(padded.substring(0, 2));
        int minute = Integer.parseInt(padded.substring(2, 4));
        int second = Integer.parseInt(padded.substring(4, 6));

        if (hour > 26 || minute > 59 || second > 59) {
            return null;
        }

        return new ParsedScheduleTime(
                hour * 10000 + minute * 100 + second,
                String.format("%02d:%02d:%02d", hour, minute, second)
        );
    }

    private ParsedScheduleTime resolvePrimaryScheduleTime(ParsedScheduleTime arrivalTime, ParsedScheduleTime departureTime) {
        if (arrivalTime != null) {
            return arrivalTime;
        }
        return departureTime;
    }

    private String resolveDisplayTime(ParsedScheduleTime scheduleTime) {
        if (scheduleTime == null) {
            return null;
        }
        return scheduleTime.displayTime();
    }

    private record SubwayScheduleCandidate(
            SubwayScheduleResponse response,
            int comparableTime
    ) {}

    private record ParsedScheduleTime(
            int comparableTime,
            String displayTime
    ) {}

    private int currentComparableTime(LocalDateTime now) {
        ParsedScheduleTime currentTime = parseScheduleTime(
                String.format("%02d%02d%02d", toServiceDayHour(now.getHour()), now.getMinute(), now.getSecond())
        );
        if (currentTime == null) {
            return 0;
        }
        return currentTime.comparableTime();
    }

    private int toServiceDayHour(int hour) {
        if (hour < 2) {
            return hour + 24;
        }
        return hour;
    }
}
