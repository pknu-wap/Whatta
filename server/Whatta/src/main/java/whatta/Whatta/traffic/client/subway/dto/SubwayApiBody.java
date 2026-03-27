package whatta.Whatta.traffic.client.subway.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SubwayApiBody {
    private SubwayApiItems items;
    private int numOfRows;
    private int pageNo;
    private int totalCount;
}
