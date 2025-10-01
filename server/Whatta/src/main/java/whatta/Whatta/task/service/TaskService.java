package whatta.Whatta.task.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.task.entity.Task;
import whatta.Whatta.task.mapper.TaskMapper;
import whatta.Whatta.task.payload.request.TaskCreateRequest;
import whatta.Whatta.task.payload.request.TaskUpdateRequest;
import whatta.Whatta.task.payload.response.TaskResponse;
import whatta.Whatta.task.repository.TaskRepository;
import whatta.Whatta.user.entity.User;
import whatta.Whatta.user.repository.UserRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepositoy;
    private final TaskMapper taskMapper;

    //task 생성
    public TaskResponse createTask(String userId, TaskCreateRequest request) {

        User user = userRepositoy.findByInstallationId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        validateLabelsInUserSettings(user, request.getLabels());

        Task newTask = taskMapper.toEntity(request, userId);

        Task savedTask = taskRepository.save(newTask);

        return taskMapper.toResponse(savedTask);
    }

    //task 업데이트
    public TaskResponse updateTask(String userId, String taskId, TaskUpdateRequest request) {

        Task originalTask = taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.TASK_NOT_FOUND));

        Task.TaskBuilder builder = originalTask.toBuilder();

        if(request.getTitle() != null) builder.title(request.getTitle());
        if(request.getContent() != null) builder.content(request.getContent());
        if(request.getLabels() != null) builder.labels(request.getLabels());
        if(request.getCompleted() != null) builder.completed(request.getCompleted());
        if(request.getPlacementDate() != null) builder.placementDate(request.getPlacementDate());
        if(request.getPlacementTime() != null) builder.placementTime(request.getPlacementTime());
        if(request.getDueDateTime() != null) builder.dueDateTime(request.getDueDateTime());
        if(request.getRepeat() != null) builder.repeat(request.getRepeat().toEntity());
        if(request.getOrderByNumber() != null) builder.orderByNumber(request.getOrderByNumber());
        if(request.getColorKey() != null) builder.colorKey(request.getColorKey());

        Task updatedTask = builder.build();
        Task savedTask = taskRepository.save(updatedTask);

        return taskMapper.toResponse(savedTask);


    }

    //task 삭제
    public void deleteTask(String userId, String taskId) {
        if(!taskRepository.existsByIdAndUserId(taskId, userId)) {
            throw new RestApiException(ErrorCode.TASK_NOT_FOUND);
        }

        taskRepository.deleteById(taskId);
    }

    //task 상세 조회
    @Transactional(readOnly = true)
    public TaskResponse findTaskById(String userId, String taskId) {
        Task task = taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.TASK_NOT_FOUND));

        return taskMapper.toResponse(task);
    }

    //task 목록 조회
    @Transactional(readOnly = true)
    public List<TaskResponse> findTasksByUser(String userId) {
        List<Task> tasks = taskRepository.findByUserId(userId);

        return tasks.stream()
                .map(taskMapper :: toResponse)
                .collect(Collectors.toList());
    }



    private void validateLabelsInUserSettings(User user, List<String> labels) { //TODO: 이후에 validator util 빼야 함
        List<String> userLabels = new ArrayList<>(user.getUserSetting().getLabels());

        for (String label : labels) {
            if(userLabels.stream().noneMatch(l -> l.equalsIgnoreCase(label))) {
                throw new RestApiException(ErrorCode.LABEL_NOT_FOUND);
            }
        }
    }
}
