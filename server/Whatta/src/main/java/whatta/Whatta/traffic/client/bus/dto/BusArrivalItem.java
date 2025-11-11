package whatta.Whatta.traffic.client.bus.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class  BusArrivalItem {
    //도착 정보 조회
    private String routeid;//버스노선 ID
    private String routeno;//버스노선번호 ex)5
    private String arrprevstationcnt; //도착예정버스 남은 정류장수 ex)15
    private String arrtime;//도착예정버스 도착예상시간[초] ex)816
    //공통
    private String nodenm;//정류소명 ex)북대전농협
    private String nodeid;//정류소ID
    //정류소 검색 조회
    private String nodeno;//정류소 번호
    private String gpslati;//정류소 Y좌표
    private String gpslong;//정류소 X좌표

}
