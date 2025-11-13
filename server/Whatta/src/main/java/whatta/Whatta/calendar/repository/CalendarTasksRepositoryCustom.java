package whatta.Whatta.calendar.repository;

import lombok.AllArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Repository;
import whatta.Whatta.calendar.repository.dto.CalendarAllDayTaskItem;
import whatta.Whatta.calendar.repository.dto.CalendarMonthlyTaskResult;
import whatta.Whatta.calendar.repository.dto.CalendarTasksResult;
import whatta.Whatta.calendar.repository.dto.CalendarTimedTaskItem;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Repository
@AllArgsConstructor
public class CalendarTasksRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    public CalendarTasksResult getDailyViewByUserId(String userId, LocalDate date) {

        AggregationOperation commonMatch = Aggregation.match(
                Criteria.where("userId").is(userId)
                        .and("placementDate").is(date));

        List<AggregationOperation> allDayOperations = new ArrayList<>();
        allDayOperations.add(Aggregation.match(
                Criteria.where("placementTime").is(null)));
        allDayOperations.add(Aggregation.project()
                .and("_id").as("id")
                .and("title").as("title")
                .and("labels._id").as("labels")
                .and("completed").as("completed")
                .and("placementDate").as("placementDate"));

        List<AggregationOperation> timedOperations = new ArrayList<>();
        timedOperations.add(Aggregation.match(
                Criteria.where("placementTime").ne(null)));
        timedOperations.add(Aggregation.project()
                .and("_id").as("id")
                .and("title").as("title")
                .and("labels._id").as("labels")
                .and("completed").as("completed")
                .and("placementDate").as("placementDate")
                .and("placementTime").as("placementTime"));
        timedOperations.add(Aggregation.sort(Sort.by(
                Sort.Order.asc("placementTime"),
                Sort.Order.asc("title")
        )));

        Aggregation aggregation = Aggregation.newAggregation(
                commonMatch,
                Aggregation.facet(
                        allDayOperations.toArray(new AggregationOperation[0])).as("allDayTasks")
                        .and(timedOperations.toArray(new AggregationOperation[0])).as("timedTasks")
        );

        CalendarTasksResult result = mongoTemplate.aggregate(aggregation,
                "tasks",
                CalendarTasksResult.class)
                .getUniqueMappedResult();

        return (result != null)
                ? result : new CalendarTasksResult(
                        List.<CalendarAllDayTaskItem>of(),
                        List.<CalendarTimedTaskItem>of());
    }

    public CalendarTasksResult getWeeklyViewByUserId(String userId, LocalDate start, LocalDate end) {

        AggregationOperation commonMatch = Aggregation.match(
                Criteria.where("userId").is(userId)
                        .and("placementDate").gte(start).lte(end)
        );

        List<AggregationOperation> allDayOperations = new ArrayList<>();
        allDayOperations.add(Aggregation.match(
                Criteria.where("placementTime").is(null)));
        allDayOperations.add(Aggregation.project()
                .and("_id").as("id")
                .and("title").as("title")
                .and("labels._id").as("labels")
                .and("completed").as("completed")
                .and("placementDate").as("placementDate"));
        allDayOperations.add(Aggregation.sort(Sort.by(
                Sort.Order.asc("placementDate")
        )));

        List<AggregationOperation> timedOperations = new ArrayList<>();
        timedOperations.add(Aggregation.match(
                Criteria.where("placementTime").ne(null)));
        timedOperations.add(Aggregation.project()
                .and("_id").as("id")
                .and("title").as("title")
                .and("labels._id").as("labels")
                .and("completed").as("completed")
                .and("placementDate").as("placementDate")
                .and("placementTime").as("placementTime"));
        timedOperations.add(Aggregation.sort(Sort.by(
                Sort.Order.asc("placementDate"),
                Sort.Order.asc("placementTime"),
                Sort.Order.asc("title")
        )));

        Aggregation aggregation = Aggregation.newAggregation(
                commonMatch,
                Aggregation.facet(
                                allDayOperations.toArray(new AggregationOperation[0])).as("allDayTasks")
                        .and(timedOperations.toArray(new AggregationOperation[0])).as("timedTasks")
        );

        CalendarTasksResult result = mongoTemplate.aggregate(aggregation,
                        "tasks",
                        CalendarTasksResult.class)
                .getUniqueMappedResult();

        return (result != null)
                ? result : new CalendarTasksResult(
                List.<CalendarAllDayTaskItem>of(),
                List.<CalendarTimedTaskItem>of());

    }

    public List<CalendarMonthlyTaskResult> getMonthlyViewByUserId(String userId, LocalDate start, LocalDate end) {

        List<AggregationOperation> operations = new ArrayList<>();
        operations.add(Aggregation.match(
                Criteria.where("userId").is(userId)
                        .and("placementDate").gte(start).lte(end)));

        operations.add(Aggregation.project()
                .and("_id").as("id")
                .and("title").as("title")
                .and("labels._id").as("labels")
                .and("completed").as("completed")
                .and("placementDate").as("placementDate")
                .and("placementTime").as("placementTime"));
        operations.add(Aggregation.sort(Sort.by(
                Sort.Order.asc("placementDate"),
                Sort.Order.asc("placementTime")
        )));

        Aggregation aggregation = Aggregation.newAggregation(operations);

        return mongoTemplate
                .aggregate(aggregation, "tasks", CalendarMonthlyTaskResult.class)
                .getMappedResults();

    }


}
