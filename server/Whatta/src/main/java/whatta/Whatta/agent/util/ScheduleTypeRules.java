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
