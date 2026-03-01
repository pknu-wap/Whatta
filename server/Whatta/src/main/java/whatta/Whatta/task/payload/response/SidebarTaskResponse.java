package whatta.Whatta.task.payload.response;


import java.time.LocalDateTime;

public record SidebarTaskResponse (

    String id,
    String title,
    Boolean completed,
    LocalDateTime completedAt,
    LocalDateTime dueDateTime,
    Long sortNumber
){}
