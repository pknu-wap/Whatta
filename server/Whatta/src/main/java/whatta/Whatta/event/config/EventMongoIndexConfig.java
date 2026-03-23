package whatta.Whatta.event.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.PartialIndexFilter;
import org.springframework.data.mongodb.core.query.Criteria;
import whatta.Whatta.event.entity.Event;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class EventMongoIndexConfig {

    private final MongoTemplate mongoTemplate;

    @PostConstruct
    public void ensureEventIndexes() {
        mongoTemplate.indexOps(Event.class).createIndex(
                new Index()
                        .on("userId", Sort.Direction.ASC)
                        .on("startDate", Sort.Direction.ASC)
                        .on("endDate", Sort.Direction.ASC)
                        .named("idx_event_nonrepeat_range")
                        .partial(PartialIndexFilter.of(Criteria.where("repeat").is(null)))
        );

        mongoTemplate.indexOps(Event.class).createIndex(
                new Index()
                        .on("userId", Sort.Direction.ASC)
                        .on("startDate", Sort.Direction.ASC)
                        .named("idx_event_repeat_start")
                        .partial(PartialIndexFilter.of(Criteria.where("repeat").exists(true)))
        );

        log.info("Event 인덱스 보장: idx_event_nonrepeat_range, idx_event_repeat_start");
    }
}
