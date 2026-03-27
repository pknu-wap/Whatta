package whatta.Whatta.agent.spec;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

public final class ScheduleExtractionSpec {
    public static final ZoneId KST_ZONE_ID = ZoneId.of("Asia/Seoul");

    private ScheduleExtractionSpec() {
    }

    public static final String NAME = "schedule_create_intent";

    public static String instructions() {
        String now = LocalDateTime.now(KST_ZONE_ID).truncatedTo(ChronoUnit.SECONDS).toString().replace('T', ' ');
        return """
                너는 자연어에서 스케줄 생성 의도를 추론하는 파서다.
                설명 문장, 마크다운, 코드블록을 절대 출력하지 않는다.

                규칙:
                1) 하나의 입력에 스케줄이 여러 개면 items 배열에 각각 분리해서 넣고, 입력에 나온 순서를 유지한다.
                2) is_schedule은 입력이 스케줄 생성과 연관이 있다면 true, 그 외는 false를 사용한다.
                4) 반복 일정이 명확히 보일 때만 repeat_rule을 넣는다.
                5) repeat_rule은 아래 형식 중 하나만 사용한다:
                   - DAILY
                   - WEEKLY:MON[,TUE...]
                   - MONTHLY:DAY=15
                   - MONTHLY:WEEK=1,DAY=MON
                   - MONTHLY:WEEK=LAST,DAY=MON
                   - MONTHLY:LASTDAY
                6) due_date_time은 마감 의미가 명확할 때만 넣는다.
                7) 날짜나 시간 정보가 명시되지 않았거나, “33일”, “25시”처럼 유효하지 않은 입력은 start_date나 start_time에 null을 넣는다.
                """
                + "8) 상대 날짜 및 시간은(오늘/내일/모레/다음 주/오전/오후/저녁 등) Asia/Seoul (KST, UTC+09:00) 기준 "
                + now
                + " 를 기준으로 해석하여 계산한다.\n";
    }

    private static final String SCHEDULE_JSON_SCHEMA = """
            {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "items": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "is_schedule": { "type": "boolean" },
                      "title": { "type": "string", "maxLength": 20 },
                      "start_date": { "type": ["string", "null"], "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
                      "end_date": { "type": ["string", "null"], "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
                      "start_time": { "type": ["string", "null"], "pattern": "^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$" },
                      "end_time": { "type": ["string", "null"], "pattern": "^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$" },
                      "due_date_time": { "type": ["string", "null"], "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2} ([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$" },
                      "repeat_rule": {
                        "type": ["string", "null"],
                        "pattern": "^(DAILY|WEEKLY:(MON|TUE|WED|THU|FRI|SAT|SUN)(,(MON|TUE|WED|THU|FRI|SAT|SUN))*|MONTHLY:DAY=([1-9]|[12][0-9]|3[01])|MONTHLY:WEEK=([1-4]|LAST),DAY=(MON|TUE|WED|THU|FRI|SAT|SUN)|MONTHLY:LASTDAY)$"
                      }
                    },
                    "required": [
                      "is_schedule",
                      "title",
                      "start_date",
                      "end_date",
                      "start_time",
                      "end_time",
                      "due_date_time",
                      "repeat_rule"
                    ]
                  }
                }
              },
              "required": ["items"]
            }
            """;

    public static JsonNode schemaNode(ObjectMapper objectMapper) {
        try {
            return objectMapper.readTree(SCHEDULE_JSON_SCHEMA);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to build schedule JSON schema", e);
        }
    }
}
