package whatta.Whatta.global.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class SwaggerConfig {

    @Value("${server.domain:/}")
    private String serverDomain;

    @Bean
    public OpenAPI openAPI() {
        Info info = new Info()
                .title("Whatta API")
                .description("Whatta API")
                .version("1.0");

        Server httpsServer = new Server();
        httpsServer.setUrl(serverDomain); // https://에 접근 가능하게 설정

        return new OpenAPI()
                .info(info)
                .servers(List.of(httpsServer));
    }

}
