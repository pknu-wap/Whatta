package whatta.Whatta.task.payload.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
@Builder
public class SidebarTaskResponse {

    private final String id;
    private final String title;
    private final Boolean completed;
    private final LocalDateTime dueDateTime;
    private final Long orderByNumber;

}
