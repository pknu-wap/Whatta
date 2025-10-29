package whatta.Whatta.task.payload.request;

public record SidebarTaskUpdateRequest(
        String title,
        Long sortNumber,
        boolean completed
) {
}
