package whatta.Whatta.calendar.repository;

import lombok.AllArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Repository;
import whatta.Whatta.calendar.payload.dto.AllDayEventResultItem;
import whatta.Whatta.calendar.payload.dto.CalendarDailyEventsResult;
import whatta.Whatta.calendar.payload.dto.TimedEventResultItem;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Repository
@AllArgsConstructor
public class CalendarEventsRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    public CalendarDailyEventsResult getDailyViewByUserId(String userId, LocalDate date) {

        AggregationOperation commonMatch = Aggregation.match(
                Criteria.where("userId").is(userId)
                        .and("startDate").lte(date)
                        .and("endDate").gte(date));

        List<AggregationOperation> allDayOperations = new ArrayList<>();
        allDayOperations.add(Aggregation.match(
                Criteria.where("startTime").is(null)));
        allDayOperations.add(Aggregation.project()
                .and("_id").as("id")
                .and("title").as("title")
                .and("colorKey").as("colorKey")
                .and("labels._id").as("labels")
                .andExpression("startDate != endDate").as("isPeriod")
                .and("startDate").as("startDate")
                .and("endDate").as("endDate")
                .andExpression("repeat != null").as("IsRepeat"));

        List<AggregationOperation> TimedOperations = new ArrayList<>();
        TimedOperations.add(Aggregation.match(
                Criteria.where("startTime").ne(null)));
        TimedOperations.add(Aggregation.project()
                .and("_id").as("id")
                .and("title").as("title")
                .and("colorKey").as("colorKey")
                .and("labels._id").as("labels")
                .and("startTime").as("startTime")
                .and("endTime").as("endTime")
                .andExpression("startDate != endDate").as("isPeriod")
                .and("startDate").as("startDate")
                .and("endDate").as("endDate")
                .andExpression("repeat != null").as("IsRepeat"));
        TimedOperations.add(Aggregation.sort(Sort.by(
                Sort.Order.asc("startTime"),
                Sort.Order.asc("endTime")
        )));

        Aggregation aggregation = Aggregation.newAggregation(
                commonMatch,
                Aggregation.facet(
                        allDayOperations.toArray(new AggregationOperation[0])).as("allDayEvents")
                        .and(TimedOperations.toArray(new AggregationOperation[0])).as("timedEvents"));

        CalendarDailyEventsResult result = mongoTemplate.aggregate(aggregation,
                        "events",
                CalendarDailyEventsResult.class)
                .getUniqueMappedResult();

        return (result != null) ?
                result : new CalendarDailyEventsResult(
                        List.<AllDayEventResultItem>of(),
                        List.<TimedEventResultItem>of());
    }
}
