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
import whatta.Whatta.task.payload.response.SidebarTaskResponse;
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

        //가장 상단의 Task를 조회
        Task topTask = taskRepository.findTopByUserIdOrderBySortNumberAsc(userId).orElse(null);

        //정렬 로직 구현
        Long newSortNumber;
        if(topTask != null){
            newSortNumber = topTask.getSortNumber() / 2;
        }
        else {
            newSortNumber = 10000L;
        }

        validateLabelsInUserSettings(user, request.getLabels());

        Task newTask = taskMapper.toEntity(request, userId).toBuilder()
                .sortNumber(newSortNumber)
                .build();

        Task savedTask = taskRepository.save(newTask);

        return taskMapper.toResponse(savedTask);
    }

    //task 업데이트
    public TaskResponse updateTask(String userId, String taskId, TaskUpdateRequest request) {

        Task originalTask = taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.TASK_NOT_FOUND));
        User user = userRepositoy.findByInstallationId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        Task.TaskBuilder builder = originalTask.toBuilder();

        if(request.getTitle() != null) builder.title(request.getTitle());
        if(request.getContent() != null) builder.content(request.getContent());
        if(request.getLabels() != null) {
            validateLabelsInUserSettings(user, request.getLabels()); //라벨 유효성 검증
            builder.labels(request.getLabels());
        }
        if(request.getCompleted() != null) builder.completed(request.getCompleted());
        if(request.getPlacementDate() != null) builder.placementDate(request.getPlacementDate());
        if(request.getPlacementTime() != null) builder.placementTime(request.getPlacementTime());
        if(request.getDueDateTime() != null) builder.dueDateTime(request.getDueDateTime());
        if(request.getRepeat() != null) builder.repeat(request.getRepeat().toEntity());
        if(request.getSortNumber() != null) builder.sortNumber(request.getSortNumber());
        if(request.getColorKey() != null) builder.colorKey(request.getColorKey());

        //명시된 field를 null로 초기화
        //혹시라도 특정필드 수정요청과 초기화를 같이 모순되게 보낼경우 초기화가 우선됨
        if(request.getFieldsToClear() != null) {
            for (String fieldName : request.getFieldsToClear()) {
                switch (fieldName) { //title이나 completed, colorkey, orderByNumber는 null로 초기화안함
                    case "content":
                        builder.content(null);
                        break;
                    case "labels":
                        builder.labels(new ArrayList<>());
                        break;
                    case "placementDate":
                        builder.placementDate(null);
                        break;
                    case "placementTime":
                        builder.placementTime(null);
                        break;
                    case "dueDateTime":
                        builder.dueDateTime(null);
                        break;
                    case "repeat":
                        builder.repeat(null);
                        break;

                }
            }
        }

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

    //task관리페이지 목록 조회
    @Transactional(readOnly = true)
    public List<TaskResponse> findTasksByUser(String userId) {
        List<Task> tasks = taskRepository.findByUserId(userId);

        return tasks.stream()
                .map(taskMapper :: toResponse)
                .collect(Collectors.toList());
    }

//    사이드바 task 목록 조회
    @Transactional(readOnly = true)
    public  List<SidebarTaskResponse> findSidebarTasks(String userId){
        List<Task> tasks = taskRepository.
                findByUserIdAndPlacementDateIsNullOrderBySortNumberAsc(userId);

        return tasks.stream()
                .map(taskMapper :: toSidebarResponse)
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
