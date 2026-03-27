package whatta.Whatta.agent.util;

import java.util.regex.Pattern;

public final class ScheduleTypeRules {

    public static final String DEFAULT_TASK_TITLE = "새로운 작업";
    private static final Pattern TASK_SIGNAL_PATTERN =
            Pattern.compile("(?<![가-힣A-Za-z0-9])(할\\s*일|작업)(?![가-힣A-Za-z0-9])");
    private static final String[] TASK_KEYWORDS = {
            "제출",
            "준비",
            "작성",
            "정리",
            "공부",
            "과제"
    };
    private static final String[] TASK_SUFFIXES = {
            "하기",
            "가기",
            "보기",
            "내기",
            "풀기",
            "쓰기",
            "읽기",
            "듣기",
            "챙기기"
    };

    private ScheduleTypeRules() {
    }

    public static boolean containsExplicitTaskSignal(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }

        return TASK_SIGNAL_PATTERN.matcher(text.trim()).find();
    }

    public static String normalizeTaskTitle(String title, boolean explicitTaskSignal) {
        if (title == null || title.isBlank()) {
            return explicitTaskSignal ? DEFAULT_TASK_TITLE : title;
        }

        String normalized = title.trim().replaceAll("\\s+", " ");
        if (!explicitTaskSignal) {
            return normalized;
        }

        String stripped = TASK_SIGNAL_PATTERN.matcher(normalized).replaceAll(" ")
                .replaceAll("\\s+", " ")
                .trim();

        return stripped.isBlank() ? DEFAULT_TASK_TITLE : stripped;
    }

    public static boolean looksLikeTaskTitle(String title) {
        if (title == null || title.isBlank()) {
            return false;
        }

        String normalized = title.trim();

        if (containsExplicitTaskSignal(normalized)) {
            return true;
        }

        for (String keyword : TASK_KEYWORDS) {
            if (normalized.contains(keyword)) {
                return true;
            }
        }

        String[] tokens = normalized.split("\\s+");
        String lastToken = tokens[tokens.length - 1];
        for (String suffix : TASK_SUFFIXES) {
            if (lastToken.endsWith(suffix)) {
                return true;
            }
        }

        return false;
    }
}
