package whatta.Whatta.traffic.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import whatta.Whatta.traffic.entity.BusFavorite;
import whatta.Whatta.traffic.entity.SubwayFavorite;

@Slf4j
@Configuration
@RequiredArgsConstructor
@ConditionalOnProperty(
        prefix = "traffic.favorite.index",
        name = "ensure-on-startup",
        havingValue = "true",
        matchIfMissing = true
)
public class TrafficMongoIndexConfig {

    private final MongoTemplate mongoTemplate;
    @Value("${traffic.favorite.index.fail-on-error:true}")
    private boolean failOnError;

    @PostConstruct
    public void ensureTrafficUniqueIndices() {
        ensureBusFavoriteUniqueIndex();
        ensureSubwayFavoriteUniqueIndex();
    }

    private void ensureBusFavoriteUniqueIndex() {
        try {
            mongoTemplate.indexOps(BusFavorite.class).createIndex(
                    new Index()
                            .on("userId", Sort.Direction.ASC)
                            .on("busStationId", Sort.Direction.ASC)
                            .on("busRouteId", Sort.Direction.ASC)
                            .unique()
                            .named("uniq_user_station_route")
            );
            log.info("BusFavorite 고유 인덱스 보장: uniq_user_station_route");
        } catch (Exception e) {
            String message = "버스 즐겨찾기 고유 인덱스 생성 실패 "
                    + "중복되는 데이터가 즐겨찾기에 있으므로 중복데이터 마이그레이션 필요";
            if (failOnError) {
                throw e;
            }
            log.error(message, e);
        }
    }

    private void ensureSubwayFavoriteUniqueIndex() {
        try {
            mongoTemplate.indexOps(SubwayFavorite.class).createIndex(
                    new Index()
                            .on("userId", Sort.Direction.ASC)
                            .on("subwayStationId", Sort.Direction.ASC)
                            .on("subwayRouteName", Sort.Direction.ASC)
                            .on("upDownTypeCode", Sort.Direction.ASC)
                            .unique()
                            .named("uniq_user_subway_station_route_direction")
            );
            log.info("SubwayFavorite 고유 인덱스 보장: uniq_user_subway_station_route_direction");
        } catch (Exception e) {
            String message = "지하철 즐겨찾기 고유 인덱스 생성 실패 "
                    + "중복되는 데이터가 즐겨찾기에 있으므로 중복데이터 마이그레이션 필요";
            if (failOnError) {
                throw e;
            }
            log.error(message, e);
        }
    }
}
