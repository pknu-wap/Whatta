package whatta.Whatta.task.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import whatta.Whatta.task.entity.Task;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TaskRepository extends MongoRepository<Task, String> {

    /*
    특정 사용자의 모든 Task를 조회
     */
    List<Task> findByUserId(String userId);

    /*
    특정 사용자의 특정 날짜(placementDate)에 해당하는 Task 목록을 조회
     */
    List<Task> findByUserIdAndPlacementDate(String userId, LocalDate date);

    /*
    특정 사용자의 특정 기간 사이에 있는 Task 목록을 조회
     */
    List<Task> findByUserIdAndPlacementDateBetween(String userId, LocalDate startDate, LocalDate endDate);

    /*
    TaskId랑 UserId로 Task 조회
     */
    Optional<Task> findByIdAndUserId(String id, String userId);

    /*
    삭제 전 taskid랑 userid로 task 존재 여부 확인
     */
    boolean existsByIdAndUserId(String id, String userId);
}