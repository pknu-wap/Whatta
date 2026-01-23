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

    //정렬 간격 상수
    private static final long SORT_GAP = 10000L;

    //task 생성
    public TaskResponse createTask(String userId, TaskCreateRequest request) {

        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_SETTING_NOT_FOUND));

        //가장 상단의 Task를 조회
        Task topTask = taskRepository.findTopByUserIdOrderBySortNumberAsc(userId).orElse(null);


        //정렬 로직 구현
        Long newSortNumber;

        if(topTask == null){
            newSortNumber = SORT_GAP;
        }
        else {
            long calculatedSortNumber = topTask.getSortNumber() / 2;

            if (calculatedSortNumber < 1) {
                log.info("Task 정렬 간격 재조정 실행 - userId: {}", userId);

                //전체 재정렬 수행
                rebalanceTasks(userId);

                topTask = taskRepository.findTopByUserIdOrderBySortNumberAsc(userId).orElseThrow();
                newSortNumber = topTask.getSortNumber() / 2;
            }
            else {
                newSortNumber = calculatedSortNumber;
            }
        }

        LabelUtil.validateLabelsInUserSettings(userSetting, request.getLabels());

        String title = (request.getTitle() == null || request.getTitle().isBlank())
                ? "새로운 작업"
                : request.getTitle();

        String content = (request.getContent() == null || request.getContent().isBlank())
                ? ""
                :request.getContent();

        List<Long> labels = (request.getLabels() == null || request.getLabels().isEmpty())
                ? new ArrayList<>()
                : request.getLabels();


        Task newTask = taskMapper.toEntity(request, userSetting).toBuilder()
                .title(title)
                .content(content)
                .labels(labels)
                .sortNumber(newSortNumber)
                .build();

        Task savedTask = taskRepository.save(newTask);
        //알림 추가
        scheduledNotiService.createReminderNotification(savedTask);

        return taskMapper.toResponse(savedTask);
    }

    //task 업데이트
    public TaskResponse updateTask(String userId, String taskId, TaskUpdateRequest request) {

        Task originalTask = taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.TASK_NOT_FOUND));

        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_SETTING_NOT_FOUND));

        Task.TaskBuilder builder = originalTask.toBuilder();

        if(request.getTitle() != null && !request.getTitle().isBlank()) builder.title(request.getTitle());
        if(request.getContent() != null) builder.content(request.getContent());
        if(request.getLabels() != null && !request.getLabels().isEmpty()) {
            LabelUtil.validateLabelsInUserSettings(userSetting, request.getLabels()); //라벨 유효성 검증
            builder.labels(request.getLabels());
        }
        if(request.getCompleted() != null) {
            builder.completed(request.getCompleted());
            //기존-미완료에서 완료로 변경시 현재 시간 적용
            if (Boolean.FALSE.equals(originalTask.getCompleted())
                    && Boolean.TRUE.equals(request.getCompleted()))
                builder.completedAt(LocalDateTime.now());
            //기존-완료에서 미완료로 변경시 초기화
            else if (Boolean.TRUE.equals(originalTask.getCompleted())
                    && Boolean.FALSE.equals(request.getCompleted()))
                builder.completedAt(null);
        }
        if(request.getPlacementDate() != null) builder.placementDate(request.getPlacementDate());
        if(request.getPlacementTime() != null) builder.placementTime(request.getPlacementTime());
        if(request.getDueDateTime() != null) builder.dueDateTime(request.getDueDateTime());
        //if(request.getRepeat() != null) builder.repeat(request.getRepeat().toEntity());
        if(request.getSortNumber() != null) builder.sortNumber(request.getSortNumber());
        if(request.getReminderNoti() != null) builder.reminderNotiAt(request.getReminderNoti());

        //명시된 field를 null로 초기화
        //혹시라도 특정필드 수정요청과 초기화를 같이 모순되게 보낼경우 초기화가 우선됨
        if(request.getFieldsToClear() != null && !request.getFieldsToClear().isEmpty()) {
            for (String fieldName : request.getFieldsToClear()) {
                switch (fieldName) { //completed, orderByNumber는 null로 초기화안함
                    case "title":
                        builder.title("새로운 작업");
                        break;
                    case "content":
                        builder.content("");
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
        //알림 수정
        scheduledNotiService.createReminderNotification(savedTask);

        return taskMapper.toResponse(savedTask);
    }

    //task 삭제
    public void deleteTask(String userId, String taskId) {
        if(!taskRepository.existsByIdAndUserId(taskId, userId)) {
            throw new RestApiException(ErrorCode.TASK_NOT_FOUND);
        }

        scheduledNotiService.cancelReminderNotification(taskId);
        taskRepository.deleteById(taskId);
    }

    //task 상세 조회
    @Transactional(readOnly = true)
    public TaskResponse getTaskDetails(String userId, String taskId) {
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

    //사이드바 task 목록 조회
    @Transactional(readOnly = true)
    public  List<SidebarTaskResponse> getSidebarTasks(String userId){
        List<Task> tasks = taskRepository.
                findByUserIdAndPlacementDateIsNullOrderBySortNumberAsc(userId);

        return tasks.stream()
                .map(taskMapper :: toSidebarResponse)
                .collect(Collectors.toList());
    }

    //재정렬
    private void rebalanceTasks(String userId) {
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
