package whatta.Whatta.traffic.client.bus.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class BusArrivalItem {

    private String routeno;//노선번호 ex)5
    private String arrprevstationcnt; //도착예정버스 남은 정류장수 ex)15
    private String arrtime;//도착예정버스 도착예상시간[초] ex)816
    private String nodenm;//정류소명 ex)북대전농협

}
