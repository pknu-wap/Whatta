package whatta.Whatta.ai.spec;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public final class ScheduleExtractionSpec {

    private ScheduleExtractionSpec() {
    }

    public static final String NAME = "schedule_create_intent";

    public static final String INSTRUCTIONS = """
            너는 사용자의 자연어에서 일정 추가 의도를 추론하는 파서다.
            반드시 제공된 JSON Schema를 100% 준수한 JSON 객체만 반환한다.
            설명 문장, 마크다운, 코드블록을 절대 출력하지 않는다.

            규칙:
            1) 일정/할일 생성 의도가 아니면 is_schedule_request=false, out_of_scope_reason에 짧은 한국어 이유를 넣는다.
            2) 일정/할일 생성 의도면 is_schedule_request=true.
            3) 일정이면 is_event=true, 할일이면 is_event=false.
            4) 일정(event)인 경우 start_date/end_date는 빈 문자열이어선 안된다.
            5) 할일(task)인 경우 placement_date/placement_time/due_date_time 중 문맥에 있는 값만 채우고 나머지는 빈 문자열로 둔다.
            6) 값이 없으면 문자열은 "", 배열은 [], 객체 내부 숫자는 0, boolean은 false를 사용한다.
            7) 날짜 형식은 YYYY-MM-DD, 시간 형식은 HH:mm:ss, 일시 형식은 YYYY-MM-DDTHH:mm:ss 를 사용한다.
            """;

    private static final String SCHEDULE_JSON_SCHEMA = """
            {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "is_schedule_request": { "type": "boolean" },
                "is_event": { "type": "boolean" },
                "out_of_scope_reason": { "type": "string", "maxLength": 120 },
                "title": { "type": "string", "maxLength": 20 },
                "content": { "type": "string", "maxLength": 100 },
                "start_date": { "type": "string", "pattern": "^$|^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
                "end_date": { "type": "string", "pattern": "^$|^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
                "start_time": { "type": "string", "pattern": "^$|^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$" },
                "end_time": { "type": "string", "pattern": "^$|^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$" },
                "placement_date": { "type": "string", "pattern": "^$|^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
                "placement_time": { "type": "string", "pattern": "^$|^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$" },
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
                },
                "reminder_noti": {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "enabled": { "type": "boolean" },
                    "day": { "type": "integer", "minimum": 0 },
                    "hour": { "type": "integer", "minimum": 0 },
                    "minute": { "type": "integer", "minimum": 0 }
                  },
                  "required": ["enabled", "day", "hour", "minute"]
                }
              },
              "required": [
                "is_schedule_request",
                "is_event",
                "out_of_scope_reason",
                "title",
                "content",
                "start_date",
                "end_date",
                "start_time",
                "end_time",
                "placement_date",
                "placement_time",
                "due_date_time",
                "repeat",
                "reminder_noti"
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
