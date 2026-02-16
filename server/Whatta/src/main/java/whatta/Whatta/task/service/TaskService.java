package whatta.Whatta.task.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.global.util.LabelUtil;
import whatta.Whatta.notification.service.ReminderNotiService;
import whatta.Whatta.task.entity.Task;
import whatta.Whatta.task.mapper.TaskMapper;
import whatta.Whatta.task.payload.request.TaskCreateRequest;
import whatta.Whatta.task.payload.request.TaskUpdateRequest;
import whatta.Whatta.task.payload.response.SidebarTaskResponse;
import whatta.Whatta.task.payload.response.TaskResponse;
import whatta.Whatta.task.repository.TaskRepository;
import whatta.Whatta.user.entity.UserSetting;
import whatta.Whatta.user.repository.UserSettingRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserSettingRepository userSettingRepository;
    private final TaskMapper taskMapper;
    private final ReminderNotiService scheduledNotiService;

    private static final long SORT_GAP = 10000L;

    public TaskResponse createTask(String userId, TaskCreateRequest request) {

        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_SETTING_NOT_FOUND));

        Task topTask = taskRepository.findTopByUserIdOrderBySortNumberAsc(userId).orElse(null);
        Long newSortNumber;

        if(topTask == null){
            newSortNumber = SORT_GAP;
        }
        else {
            long calculatedSortNumber = topTask.getSortNumber() / 2;

            if (calculatedSortNumber < 1) {
                log.info("Task 정렬 간격 재조정 실행 - userId: {}", userId);
                rebalanceSortOrder(userId);
                topTask = taskRepository.findTopByUserIdOrderBySortNumberAsc(userId).orElseThrow();
                newSortNumber = topTask.getSortNumber() / 2;
            }
            else {
                newSortNumber = calculatedSortNumber;
            }
        }

        if (request.labels() != null && !request.labels().isEmpty()) {
            LabelUtil.validateLabelsInUserSettings(userSetting, request.labels());
        }

        String title = (request.title() != null && !request.title().isBlank())
                ? request.title()
                : Task.DEFAULT_TITLE;

        String content = (request.content() != null)
                ? request.content()
                : Task.DEFAULT_CONTENT;

        List<Long> labels = (request.labels() != null)
                ? request.labels()
                : new ArrayList<>();

        Task newTask = Task.builder()
                .userId(userId)
                .title(title)
                .content(content)
                .labels(labels)
                .completed(false)
                .completedAt(null)
                .sortNumber(newSortNumber)
                .placementDate(request.placementDate())
                .placementTime(request.placementTime())
                .dueDateTime(request.dueDateTime())
                .repeat(request.repeat() != null ? request.repeat().toEntity() : null)
                .reminderNotiAt(request.reminderNoti())
                .build();

        Task savedTask = taskRepository.save(newTask);
        scheduledNotiService.updateReminderNotification(savedTask);

        return taskMapper.toResponse(savedTask);
    }

    public TaskResponse updateTask(String userId, String taskId, TaskUpdateRequest request) {

        Task originalTask = taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.TASK_NOT_FOUND));

        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_SETTING_NOT_FOUND));

        Task.TaskBuilder builder = originalTask.toBuilder();

        if(request.title() != null && !request.title().isBlank()) builder.title(request.title());
        if(request.content() != null) builder.content(request.content());
        if(request.labels() != null && !request.labels().isEmpty()) {
            LabelUtil.validateLabelsInUserSettings(userSetting, request.labels()); //라벨 유효성 검증
            builder.labels(request.labels());
        }
        if(request.completed() != null) {
            builder.completed(request.completed());
            if (Boolean.FALSE.equals(originalTask.getCompleted())
                    && Boolean.TRUE.equals(request.completed()))
                builder.completedAt(LocalDateTime.now());
            else if (Boolean.TRUE.equals(originalTask.getCompleted())
                    && Boolean.FALSE.equals(request.completed()))
                builder.completedAt(null);
        }
        if(request.placementDate() != null) builder.placementDate(request.placementDate());
        if(request.placementTime() != null) builder.placementTime(request.placementTime());
        if(request.dueDateTime() != null) builder.dueDateTime(request.dueDateTime());
        if(request.repeat() != null) builder.repeat(request.repeat().toEntity());
        if(request.sortNumber() != null) builder.sortNumber(request.sortNumber());
        if(request.reminderNoti() != null) builder.reminderNotiAt(request.reminderNoti());

        //명시된 field를 null로 초기화
        //혹시라도 특정필드 수정요청과 초기화를 같이 모순되게 보낼경우 초기화가 우선됨
        if(request.fieldsToClear() != null && !request.fieldsToClear().isEmpty()) {
            for (String fieldName : request.fieldsToClear()) {
                switch (fieldName) { //completed, orderByNumber는 null로 초기화안함
                    case "title":
                        builder.title(Task.DEFAULT_TITLE);
                        break;
                    case "content":
                        builder.content(Task.DEFAULT_CONTENT);
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
                    /*case "repeat":
                        builder.repeat(null);
                        break;*/
                    case "reminderNoti":
                        builder.reminderNotiAt(null);
                        break;
                }
            }
        }
        builder.updatedAt(LocalDateTime.now());

        Task updatedTask = builder.build();
        Task savedTask = taskRepository.save(updatedTask);
        scheduledNotiService.updateReminderNotification(savedTask);

        return taskMapper.toResponse(savedTask);
    }

    public void deleteTask(String userId, String taskId) {
        if(!taskRepository.existsByIdAndUserId(taskId, userId)) {
            throw new RestApiException(ErrorCode.TASK_NOT_FOUND);
        }

        scheduledNotiService.cancelReminderNotification(taskId);
        taskRepository.deleteById(taskId);
    }

    @Transactional(readOnly = true)
    public TaskResponse getTask(String userId, String taskId) {
        Task task = taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.TASK_NOT_FOUND));

        return taskMapper.toResponse(task);
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getAllTasks(String userId) {
        List<Task> tasks = taskRepository.findByUserId(userId);

        return tasks.stream()
                .map(taskMapper :: toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public  List<SidebarTaskResponse> getSidebarTasks(String userId){
        List<Task> tasks = taskRepository.
                findByUserIdAndPlacementDateIsNullOrderBySortNumberAsc(userId);

        return tasks.stream()
                .map(taskMapper :: toSidebarResponse)
                .collect(Collectors.toList());
    }

    private void rebalanceSortOrder(String userId) {
        List<Task> tasks = taskRepository.findByUserIdOrderBySortNumberAsc(userId);

        if(tasks.isEmpty()) return;

        List<Task> updatedTasks = new ArrayList<>();
        AtomicLong counter = new AtomicLong(0);

        for(Task task : tasks) {
            long newSort = counter.addAndGet(SORT_GAP);

            if(task.getSortNumber() != newSort) {
                updatedTasks.add(
                        task.toBuilder().sortNumber(newSort).build()
                );
            }
        }
        if (!updatedTasks.isEmpty()) {
            taskRepository.saveAll(updatedTasks);
        }
    }

}
