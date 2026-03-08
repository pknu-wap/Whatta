package whatta.Whatta.ai.spec;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public final class ScheduleExtractionSpec {

    private ScheduleExtractionSpec() {
    }

    public static final String NAME = "schedule_create_intent";

    public static final String INSTRUCTIONS = """
            너는 사용자의 자연어에서 일정/할일 추가 의도를 추론하는 파서다.
            반드시 제공된 JSON Schema를 100% 준수한 JSON 객체만 반환한다.
            설명 문장, 마크다운, 코드블록을 절대 출력하지 않는다.

            규칙:
            1) intent는 사용자의 요청 의도에 해당하는 enum을 사용한다. 할일이면 create_task를 사용한다.
            2) 값이 없으면 문자열은 "", 배열은 [], 객체 내부 숫자는 0, boolean은 false를 사용한다.
            3) 날짜 형식은 YYYY-MM-DD, 시간 형식은 HH:mm:ss, 일시 형식은 YYYY-MM-DDTHH:mm:ss 를 사용한다.
            4) 상대 날짜(오늘/내일/모레/다음 주 등)는 절대 날짜로 계산하지 말고 date_ref에 기록한다.
            5) 상대 시간(오전/오후/저녁/밤/이따 등)은 절대 시간으로 계산하지 말고 time_ref에 기록한다.
            6) 절대 날짜가 명시된 경우 start_date/end_date 또는 due_date_time에 넣고 date_ref는 explicit_date로 둔다.
            7) 절대 시간이 명시된 경우 start_time/end_time 또는 due_date_time에 넣고 time_ref는 explicit_time으로 둔다.
            8) date_ref/time_ref만 있고 절대값이 불명확하면 start_date/start_time/end_date/end_time/due_date_time은 빈 문자열("")로 둔다.
            """;

    private static final String SCHEDULE_JSON_SCHEMA = """
            {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "intent": { "type": "string","enum": ["create_event", "create_task", "update_or_delete", "unspecified"] },
                "title": { "type": "string", "maxLength": 20 },
                "date_ref": { "type": "string", "enum": ["", "today", "tomorrow", "day_after_tomorrow", "explicit_date", "relative_date"] },
                "time_ref": { "type": "string", "enum": ["", "morning", "afternoon", "evening", "night", "explicit_time", "relative_time"] },
                "start_date": { "type": "string", "pattern": "^$|^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
                "end_date": { "type": "string", "pattern": "^$|^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
                "start_time": { "type": "string", "pattern": "^$|^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$" },
                "end_time": { "type": "string", "pattern": "^$|^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$" },
                "due_date_time": { "type": "string", "pattern": "^$|^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$" },
                "repeat": {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "enabled": { "type": "boolean" },
                    "interval": { "type": "integer", "minimum": 1 },
                    "unit": { "type": "string", "enum": ["", "DAY", "WEEK", "MONTH"] },
                    "on": {
                      "type": "array",
                      "items": {
                        "type": "string",
                        "pattern": "^(MON|TUE|WED|THU|FRI|SAT|SUN|D([1-9]|[12][0-9]|3[01])|([1-4])(MON|TUE|WED|THU|FRI|SAT|SUN)|LAST(MON|TUE|WED|THU|FRI|SAT|SUN)|LASTDAY)$"
                      }
                    },
                    "deadline": { "type": "string", "pattern": "^$|^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
                    "exception_dates": {
                      "type": "array",
                      "items": { "type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" }
                    }
                  },
                  "required": ["enabled", "interval", "unit", "on", "deadline", "exception_dates"]
                }
              },
              "required": [
                "intent",
                "title",
                "date_ref",
                "time_ref",
                "start_date",
                "end_date",
                "start_time",
                "end_time",
                "due_date_time",
                "repeat"
              ]
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
