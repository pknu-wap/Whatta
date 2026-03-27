package whatta.Whatta.traffic.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import whatta.Whatta.traffic.enums.TrafficTransportType;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrafficNotificationTarget {

    private String itemId;
    private TrafficTransportType transportType;
}
