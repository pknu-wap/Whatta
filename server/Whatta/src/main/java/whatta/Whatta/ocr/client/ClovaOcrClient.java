package whatta.Whatta.ocr.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import whatta.Whatta.ocr.payload.response.ClovaOcrResponse;
import whatta.Whatta.ocr.payload.request.ClovaOcrRequest;
import whatta.Whatta.ocr.payload.request.ImageUploadRequest;

import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ClovaOcrClient {

    @Value("${clova.ocr.url}")
    private String ocrUrl;

    @Value("${clova.ocr.secret.key}")
    private String secretKey;

    ObjectMapper objectMapper = new ObjectMapper();

    public ClovaOcrResponse callApi(ImageUploadRequest request) {
        try{
            // ----------- 요청 전송 ---------------------
            HttpURLConnection connection = creatHeader();
            ClovaOcrRequest requestBody = ClovaOcrRequest.builder()
                    .version("V2")
                    .requestId(UUID.randomUUID().toString())
                    .timestamp(System.currentTimeMillis())
                    .lang("ko")
                    .images(List.of(request.image()))
                    .enableTableDetection(false)
                    .build();

            connection.connect();
            DataOutputStream outputStream = new DataOutputStream(connection.getOutputStream());
            outputStream.write(objectMapper.writeValueAsBytes(requestBody));
            outputStream.flush();
            outputStream.close();

            // ----------- 응답 수신 ---------------------
            int responseCode = connection.getResponseCode();
            BufferedReader reader;
            if(responseCode == HttpURLConnection.HTTP_OK) {
                reader = new BufferedReader(new InputStreamReader(connection.getInputStream())); //서버가 준 바이트스트림(InputStream)을 문자스트림(Reader)으로 바꾸는 단계
            } else {
                reader = new BufferedReader(new InputStreamReader(connection.getErrorStream()));
            }

            StringBuilder response = new StringBuilder();
            String line;
            while((line = reader.readLine()) != null) {
                response.append(line);
            }
            reader.close();
            connection.disconnect();
            // ----------- 데이터 파싱 ---------------------
            try {
                //JSON 응답 문자열을 record 기반 ClovaOcrResponse 객체로 변환
                objectMapper.configure(
                        com.fasterxml.jackson.databind.DeserializationFeature
                                .FAIL_ON_UNKNOWN_PROPERTIES,
                        false);

                return objectMapper.readValue(response.toString(), ClovaOcrResponse.class);

            } catch (IOException e) {
                throw new RuntimeException("OCR 응답 파싱 실패", e);
            }
        } catch (Exception e){
            throw new RuntimeException("CLOVA OCR 요청 또는 응답 처리 중 오류가 발생했습니다.", e);
        }
    }

    private HttpURLConnection creatHeader() throws IOException {
        URL url = new URL(ocrUrl);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setDoOutput(true);
        connection.setDoInput(true);
        connection.setUseCaches(false);
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        connection.setRequestProperty("X-OCR-SECRET", secretKey);
        return connection;
    }
}
