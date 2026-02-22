package whatta.Whatta.event.entity;


import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.user.payload.dto.ReminderNoti;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Document("events")
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Builder(toBuilder = true)
public class Event {

    @Id
    private String id;

    @NotNull
    private String userId;

    @NotBlank
    @Builder.Default
    private String title = "새로운 일정";

    @NotNull
    @Builder.Default
    private String content = "";

    @NotNull
    @Builder.Default
    private List<Long> labels = new ArrayList<>(); //라벨 설정하지 않으면 빈 리스트

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    @Builder.Default
    private LocalTime startTime = null;
    @Builder.Default
    private LocalTime endTime = null;

    private Repeat repeat;

    @NotNull
    private String colorKey;

    @Builder.Default
    private ReminderNoti reminderNotiAt = null;

    @CreatedDate
    private LocalDateTime createdAt;
    @LastModifiedDate
    private LocalDateTime updatedAt = LocalDateTime.now();

    public boolean isPeriod() { return !startDate.equals(endDate); }
    public boolean hasTime() { return startTime!=null && endTime!=null; }
    public boolean isRepeat() { return repeat != null; }

    public Event normalizeAndValidateDateTimeOrder() {
        normalizeForTimeRules();
        validateDateTimeOrder();
        return this;
    }

    private void normalizeForTimeRules() {
        if(this.startTime == null || this.endTime == null) {
            this.toBuilder()
                    .startTime(null)
                    .endTime(null)
                    .reminderNotiAt(null)
                    .build();
        }
    }

    private void validateDateTimeOrder() {
        if(startDate.isAfter(endDate)) {
            throw new RestApiException(ErrorCode.DATE_ORDER_INVALID);
        }
        if(startDate.equals(endDate) && startTime != null && endTime != null) {
            if(startTime.isAfter(endTime)) {
                throw new RestApiException(ErrorCode.TIME_ORDER_INVALID);
            }
        }
    }
}
