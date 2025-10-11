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
    TaskId랑 UserId로 Task 상세 조회
     */
    Optional<Task> findByIdAndUserId(String id, String userId);

    /*
    삭제 전 taskid랑 userid로 task 존재 여부 확인
     */
    boolean existsByIdAndUserId(String id, String userId);

    /*
    userId로 조회된 Task들을 orderByNumber 오름차순으로 정렬한 뒤, 가장 첫 번째(Top) 결과를 가져옴
     */
    Optional<Task> findTopByUserIdOrderBySortNumberAsc(String userId);

    // userId로 찾고, placementDate가 null인 것들만, orderByNumber 오름차순으로 정렬
    List<Task> findByUserIdAndPlacementDateIsNullOrderBySortNumberAsc(String userId);
}