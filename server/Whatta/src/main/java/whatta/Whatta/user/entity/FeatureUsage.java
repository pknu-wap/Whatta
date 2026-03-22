package whatta.Whatta.user.entity;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import whatta.Whatta.user.enums.FeatureType;

import java.time.LocalDate;

@Document("feature_usages")
@CompoundIndex(
        name = "idx_feature_usage_user_feature",
        def = "{'userId': 1, 'featureType': 1}",
        unique = true
)
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Builder(toBuilder = true)
public class FeatureUsage {

    @Id
    private String id;

    @NotNull
    private String userId;

    @NotNull
    private FeatureType featureType;

    @NotNull
    private LocalDate usageDate;

    @Builder.Default
    private int usedCount = 0;
}
