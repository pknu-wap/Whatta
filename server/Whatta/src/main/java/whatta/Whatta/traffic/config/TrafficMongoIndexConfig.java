package whatta.Whatta.traffic.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import whatta.Whatta.traffic.entity.BusFavorite;

@Configuration
@RequiredArgsConstructor
public class TrafficMongoIndexConfig {

    private final MongoTemplate mongoTemplate;

    @PostConstruct
    public void ensureBusFavoriteUniqueIndex() {
        mongoTemplate.indexOps(BusFavorite.class).createIndex(
                new Index()
                        .on("userId", Sort.Direction.ASC)
                        .on("busStationId", Sort.Direction.ASC)
                        .on("busRouteId", Sort.Direction.ASC)
                        .unique()
                        .named("uniq_user_station_route")
        );
    }
}
