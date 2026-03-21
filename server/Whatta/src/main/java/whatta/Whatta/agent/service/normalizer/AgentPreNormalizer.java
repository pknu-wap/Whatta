package whatta.Whatta.agent.service.normalizer;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class AgentPreNormalizer {

    private static final Map<String, String> REPLACEMENTS = new LinkedHashMap<>();

    static {
        REPLACEMENTS.put("낼", "내일");
        REPLACEMENTS.put("담주", "다음주");
        REPLACEMENTS.put("담 주", "다음주");
        REPLACEMENTS.put("다음 주", "다음주");
        REPLACEMENTS.put("이번 주", "이번주");
        REPLACEMENTS.put("월욜", "월요일");
        REPLACEMENTS.put("화욜", "화요일");
        REPLACEMENTS.put("수욜", "수요일");
        REPLACEMENTS.put("목욜", "목요일");
        REPLACEMENTS.put("금욜", "금요일");
        REPLACEMENTS.put("토욜", "토요일");
        REPLACEMENTS.put("일욜", "일요일");
    }

    public String normalize(String input) {
        if (input == null) {
            return "";
        }

        String normalized = input
                .replace("\r\n", "\n")
                .replace('\r', '\n');

        String[] lines = normalized.split("\n", -1);
        for (int i = 0; i < lines.length; i++) {
            lines[i] = lines[i].replaceAll("[\\t\\x0B\\f ]+", " ").trim();
        }

        normalized = String.join("\n", lines).strip();
        normalized = stripWrappingQuotes(normalized);
        for (Map.Entry<String, String> entry : REPLACEMENTS.entrySet()) {
            normalized = normalized.replace(entry.getKey(), entry.getValue());
        }
        return normalized;
    }

    private String stripWrappingQuotes(String input) {
        if (input.length() < 2) {
            return input;
        }

        if ((input.startsWith("\"") && input.endsWith("\""))
                || (input.startsWith("'") && input.endsWith("'"))) {
            return input.substring(1, input.length() - 1).trim();
        }
        return input;
    }
}
