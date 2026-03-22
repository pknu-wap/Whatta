package whatta.Whatta.user.entity;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import whatta.Whatta.user.enums.PlanStatus;
import whatta.Whatta.user.enums.PlanType;

import java.time.LocalDateTime;

@Document("user_plans")
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Builder(toBuilder = true)
public class UserPlan {

    @Id
    private String id;

    @NotNull
    @Indexed(unique = true)
    private String userId;

    @NotNull
    @Builder.Default
    private PlanType planType = PlanType.FREE;

    @NotNull
    @Builder.Default
    private PlanStatus planStatus = PlanStatus.ACTIVE;

    private LocalDateTime startedAt;

    private LocalDateTime expiredAt;

    @LastModifiedDate
    private LocalDateTime updateAt;
}
