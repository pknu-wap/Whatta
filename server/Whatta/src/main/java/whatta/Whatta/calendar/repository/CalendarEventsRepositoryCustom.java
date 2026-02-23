package whatta.Whatta.calendar.repository;

import lombok.AllArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Repository;
import whatta.Whatta.calendar.repository.dto.CalendarAllDayEventItem;
import whatta.Whatta.calendar.repository.dto.CalendarEventsResult;
import whatta.Whatta.calendar.repository.dto.CalendarMonthlyEventResult;
import whatta.Whatta.calendar.repository.dto.CalendarTimedEventItem;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Repository
@AllArgsConstructor
public class CalendarEventsRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    public CalendarEventsResult getDailyViewByUserId(String userId, LocalDate date) {

        Criteria base = Criteria.where("userId").is(userId)
                .and("startDate").lte(date);

        Criteria nonRepeat = new Criteria().andOperator(
                Criteria.where("repeat").is(null),
                Criteria.where("endDate").gte(date)
        );

        Criteria hasRepeat = new Criteria().andOperator(
                Criteria.where("repeat").ne(null),
                Criteria.where("repeat.deadline").gte(date)
        );

        AggregationOperation commonMatch = Aggregation.match(
                new Criteria().andOperator(
                        base,
                        new Criteria().orOperator(nonRepeat, hasRepeat)
                )
        );

        List<AggregationOperation> allDayOperations = new ArrayList<>();
        allDayOperations.add(Aggregation.match(
                Criteria.where("startTime").is(null)));
        allDayOperations.add(Aggregation.project()
                .and("_id").as("id")
                .and("title").as("title")
                .and("colorKey").as("colorKey")
                .and("labels").as("labels")
                .andExpression("startDate != endDate").as("isSpan")
                .and("startDate").as("startDate")
                .and("endDate").as("endDate")
                .and("repeat").as("repeat"));

        List<AggregationOperation> timedOperations = new ArrayList<>();
        timedOperations.add(Aggregation.match(
                Criteria.where("startTime").ne(null)));
        timedOperations.add(Aggregation.project()
                .and("_id").as("id")
                .and("title").as("title")
                .and("colorKey").as("colorKey")
                .and("labels").as("labels")
                .and("startTime").as("startTime")
                .and("endTime").as("endTime")
                .andExpression("startDate != endDate").as("isSpan")
                .and("startDate").as("startDate")
                .and("endDate").as("endDate")
                .and("repeat").as("repeat"));
        timedOperations.add(Aggregation.sort(Sort.by(
                Sort.Order.asc("startTime"),
                Sort.Order.asc("endTime")
        )));

        Aggregation aggregation = Aggregation.newAggregation(
                commonMatch,
                Aggregation.facet(
                                allDayOperations.toArray(new AggregationOperation[0])).as("allDayEvents")
                        .and(timedOperations.toArray(new AggregationOperation[0])).as("timedEvents"));

        CalendarEventsResult result = mongoTemplate.aggregate(aggregation,
                        "events",
                        CalendarEventsResult.class)
                .getUniqueMappedResult();

        return (result != null)
                ? result : new CalendarEventsResult(
                List.<CalendarAllDayEventItem>of(),
                List.<CalendarTimedEventItem>of());
    }

    public CalendarEventsResult getWeeklyViewByUserId(String userId, LocalDate start, LocalDate end) {

        Criteria base = Criteria.where("userId").is(userId)
                .and("startDate").lte(end);

        Criteria nonRepeat = new Criteria().andOperator(
                Criteria.where("repeat").is(null),
                Criteria.where("endDate").gte(start)
        );

        Criteria hasRepeat = new Criteria().andOperator(
                Criteria.where("repeat").ne(null),
                Criteria.where("repeat.deadline").gte(start)
        );

        AggregationOperation commonMatch = Aggregation.match(
                new Criteria().andOperator(
                        base,
                        new Criteria().orOperator(nonRepeat, hasRepeat)
                )
        );

        List<AggregationOperation> allDayOperations = new ArrayList<>();
        allDayOperations.add(Aggregation.match(Criteria.where("startTime").is(null)));
        allDayOperations.add(
                Aggregation.project()
                        .and("_id").as("id")
                        .and("title").as("title")
                        .and("colorKey").as("colorKey")
                        .and("labels").as("labels")
                        .andExpression("startDate != endDate").as("isSpan")
                        .and("startDate").as("startDate")
                        .and("endDate").as("endDate")
                        .and("repeat").as("repeat"));
        allDayOperations.add(Aggregation.sort(Sort.by(
                Sort.Order.asc("startDate"))));

        List<AggregationOperation> timedOperations = new ArrayList<>();
        timedOperations.add(Aggregation.match(Criteria.where("startTime").ne(null)));
        timedOperations.add(
                Aggregation.project()
                        .and("_id").as("id")
                        .and("title").as("title")
                        .and("colorKey").as("colorKey")
                        .and("labels").as("labels")
                        .and("startTime").as("startTime")
                        .and("endTime").as("endTime")
                        .andExpression("startDate != endDate").as("isSpan")
                        .and("startDate").as("startDate")
                        .and("endDate").as("endDate")
                        .and("repeat").as("repeat"));
        timedOperations.add(Aggregation.sort(Sort.by(
                Sort.Order.asc("startDate"),
                Sort.Order.asc("startTime"))));

        Aggregation aggregation = Aggregation.newAggregation(
                commonMatch,
                Aggregation.facet(
                                allDayOperations.toArray(new AggregationOperation[0])).as("allDayEvents")
                        .and(timedOperations.toArray(new AggregationOperation[0])).as("timedEvents"));

        CalendarEventsResult result = mongoTemplate.aggregate(aggregation,
                        "events",
                        CalendarEventsResult.class)
                .getUniqueMappedResult();

        return (result != null)
                ? result : new CalendarEventsResult(
                List.<CalendarAllDayEventItem>of(),
                List.<CalendarTimedEventItem>of());
    }

    public List<CalendarMonthlyEventResult> getMonthlyViewByUserId(String userId, LocalDate start, LocalDate end) {

        Criteria base = Criteria.where("userId").is(userId)
                .and("startDate").lte(end);

        Criteria nonRepeat = new Criteria().andOperator(
                Criteria.where("repeat").is(null),
                Criteria.where("endDate").gte(start)
        );

        Criteria hasRepeat = new Criteria().andOperator(
                Criteria.where("repeat").ne(null),
                Criteria.where("repeat.deadline").gte(start)
        );

        AggregationOperation commonMatch = Aggregation.match(
                new Criteria().andOperator(
                        base,
                        new Criteria().orOperator(nonRepeat, hasRepeat)
                )
        );

        List<AggregationOperation> operations = new ArrayList<>();
        operations.add(commonMatch);
        operations.add(Aggregation.project()
                .and("_id").as("id")
                .and("title").as("title")
                .and("colorKey").as("colorKey")
                .and("labels").as("labels")
                .andExpression("startDate != endDate").as("isSpan")
                .and("startDate").as("startDate")
                .and("endDate").as("endDate")
                .and("startTime").as("startTime")
                .and("endTime").as("endTime")
                .and("repeat").as("repeat"));
        operations.add(Aggregation.sort(Sort.by(
                Sort.Order.asc("startDate"),
                Sort.Order.asc("endDate"),
                Sort.Order.asc("startTime"),
                Sort.Order.asc("endTime"))));

        Aggregation aggregation = Aggregation.newAggregation(operations);

        return mongoTemplate
                .aggregate(aggregation, "events", CalendarMonthlyEventResult.class)
                .getMappedResults();
    }
}
