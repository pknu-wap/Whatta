package whatta.Whatta.traffic.client.bus.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class BusApiBody {
    private BusApiItems items;
    private int totalCount;//전체 결과 수
    private int numOfRows;//한 페이지 결과 수
    private int pageNo;//페이지 번호
}
