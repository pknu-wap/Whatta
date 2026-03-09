package whatta.Whatta.ai.spec;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public final class ScheduleExtractionSpec {

    private ScheduleExtractionSpec() {
    }

    public static final String NAME = "schedule_create_intent";

    public static final String INSTRUCTIONS = """
            너는 사용자의 자연어에서 일정/할일 생성 의도를 추론하는 파서다.
            설명 문장, 마크다운, 코드블록을 절대 출력하지 않는다.

            규칙:
            1) 하나의 입력에 일정/할일이 여러 개면 items 배열에 각각 분리해서 넣고, 입력에 나온 순서를 유지한다.
            2) intent는 각 항목의 요청 의도에 해당하는 enum을 사용히며, 행동이 title 이면 creat_task를 사용한다.
            3) 값이 없으면 문자열은 "", 배열은 [], 객체 내부 숫자는 0, boolean은 false를 사용한다.
            4) 모든 필드는 title 을 보고 유추하여 값을 넣는다.
            5) 일정(event)은 due_date_time을 빈문자열("")로 두며, 할일(task)는 end_Time을 빈문자열("")로 둔다.
            6) 상대 날짜 및 시간은(오늘/내일/모레/다음 주/오전/오후/저녁 등)는 기준 시각(now)을 'Asia/Seoul'(KST, UTC+09:00)로 해석하여 계산한다.
            7) 절대적 날짜 또는 시간이 명시된 경우 start/end 또는 due_date_time에 넣는다.
            8) 날짜와 시간 모두에 대한 언급이 없다면 'Asia/Seoul'(KST, UTC+09:00)의 지금(now)를 start_date/end_date에 넣는다.
            9) start_time에 값이 있을 경우, title을 보고 유추하여 end_time을 계산한다.
            """;

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
                      "intent": { "type": "string","enum": ["create_event", "create_task", "update_or_delete", "unrelated"] },
                      "title": { "type": "string", "maxLength": 20 },
                      "start_date": { "type": "string", "pattern": "^$|^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
                      "end_date": { "type": "string", "pattern": "^$|^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
                      "start_time": { "type": "string", "pattern": "^$|^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$" },
                      "end_time": { "type": "string", "pattern": "^$|^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$" },
                      "due_date_time": { "type": "string", "pattern": "^$|^[0-9]{4}-[0-9]{2}-[0-9]{2} ([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$" },
                      "repeat": {
                        "type": "object",
                        "additionalProperties": false,
                        "properties": {
                          "enabled": { "type": "boolean" },
                          "interval": { "type": "integer", "minimum": 0 },
                          "unit": { "type": "string", "enum": ["", "DAY", "WEEK", "MONTH"] },
                          "on": {
                            "type": "array",
                            "items": {
                              "type": "string",
                              "pattern": "^(MON|TUE|WED|THU|FRI|SAT|SUN|D([1-9]|[12][0-9]|3[01])|([1-4])(MON|TUE|WED|THU|FRI|SAT|SUN)|LAST(MON|TUE|WED|THU|FRI|SAT|SUN)|LASTDAY)$"
                            }
                          },
                          "deadline": { "type": "string", "pattern": "^$|^[0-9]{4}-[0-9]{2}-[0-9]{2}$" }
                        },
                        "required": ["enabled", "interval", "unit", "on", "deadline"]
                      }
                    },
                    "required": [
                      "intent",
                      "title",
                      "start_date",
                      "end_date",
                      "start_time",
                      "end_time",
                      "due_date_time",
                      "repeat"
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
