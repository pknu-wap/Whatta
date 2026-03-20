package whatta.Whatta.agent.util;

public final class ScheduleTypeRules {

    private static final String[] TASK_KEYWORDS = {
            "제출",
            "준비",
            "작성",
            "정리",
            "공부",
            "과제"
    };

    private ScheduleTypeRules() {
    }

    public static boolean looksLikeTaskTitle(String title) {
        if (title == null || title.isBlank()) {
            return false;
        }

        String normalized = title.trim();

        for (String keyword : TASK_KEYWORDS) {
            if (normalized.contains(keyword)) {
                return true;
            }
        }

        return normalized.endsWith("기");
    }
}
