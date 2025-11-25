package whatta.Whatta.traffic.client.bus.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class BusApiHeader {
    private String resultCode; //결과코드 ex)00
    private String resultMsg; //결과메세지 ex)OK
}
