package whatta.Whatta.task.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import whatta.Whatta.global.payload.Response;
import whatta.Whatta.task.payload.request.TaskCreateRequest;
import whatta.Whatta.task.payload.request.TaskUpdateRequest;
import whatta.Whatta.task.payload.response.SidebarTaskResponse;
import whatta.Whatta.task.payload.response.TaskResponse;
import whatta.Whatta.task.service.TaskService;

import java.util.List;

@RestController
@RequestMapping("/api/task")
@RequiredArgsConstructor
@Tag(name = "Task", description = "Task API")
public class TaskController {

    private final TaskService taskService;

    @PostMapping
    @Operation(summary = "Task 생성", description = "새로운 Task를 생성합니다.")
    public ResponseEntity<?> createTask(@RequestBody @Validated TaskCreateRequest request) {
        String tempUserId = "user123"; //TODO 나중에 jwt구현 후 변경
        TaskResponse response = taskService.createTask(tempUserId, request);
        return Response.ok("Task 생성 성공했습니다.", response);
    }

    @PutMapping("/{taskId}")
    @Operation(summary = "Task 수정", description = "해당 Task를 수정합니다.")
    public ResponseEntity<?> updateTask(@PathVariable String taskId,
                                        @RequestBody @Validated TaskUpdateRequest request) {
        String tempUserId = "user123"; //TODO 나중에 jwt구현 후 변경
        TaskResponse response = taskService.updateTask(tempUserId, taskId, request);
        return Response.ok("Task 수정 성공했습니다.", response);
    }

    @DeleteMapping("/{taskId}")
    @Operation(summary = "Task 삭제", description = "해당 Task를 삭제합니다.")
    public ResponseEntity<?> deleteTask(@PathVariable String taskId) {
        String tempUserId = "user123"; //TODO 나중에 jwt구현 후 변경
        taskService.deleteTask(tempUserId, taskId);
        return Response.ok("Task 삭제 성공했습니다.");
    }

    @GetMapping("/{taskId}")
    @Operation(summary = "Task 상세조회", description = "해당 Task를 상세조회합니다.")
    public ResponseEntity<?> getTaskById(@PathVariable String taskId) {
        String tempUserId = "user123"; //TODO 나중에 jwt구현 후 변경
        TaskResponse response = taskService.findTaskById(tempUserId, taskId);
        return Response.ok("Task 상세 정보입니다.", response);
    }

    @GetMapping
    @Operation(summary = "Task 목록조회", description = "관리페이지의 모든 Task 목록을 조회합니다.")
    public ResponseEntity<?> getAllTasks() {
        String tempUserId = "user123"; //TODO 나중에 jwt구현 후 변경
        List<TaskResponse> response = taskService.findTasksByUser(tempUserId);
        return Response.ok("관리페이지 Task 목록입니다.", response);
    }

    @GetMapping(params = "view=sidebar")
    @Operation(summary = "사이드바 Task 목록 조회", description = "배치되지 않은 사이드바의 task 목록을 조회합니다.")
    public ResponseEntity<?> getSidebarTasks() {
        String tempUserId = "user123"; //TODO 나중에 jwt구현 후 변경
        List<SidebarTaskResponse> response = taskService.findSidebarTasks(tempUserId);
        return Response.ok("사이드바의 Task 목록입니다.", response);
    }
}
