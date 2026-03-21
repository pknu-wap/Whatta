package whatta.Whatta.global.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

@Slf4j
@Configuration
public class GcsConfig {

    @Value("${gcs.project.id:}")
    private String gcsProjectId;

    @Value("${gcs.json.path:}")
    private String gcsJsonPath;

    @Bean
    public Storage gcsStorage() {
        try {
            StorageOptions.Builder builder = StorageOptions.newBuilder();

            if (gcsProjectId != null && !gcsProjectId.isBlank()) {
                builder.setProjectId(gcsProjectId.trim());
            }

            if (gcsJsonPath != null && !gcsJsonPath.isBlank()) {
                try (InputStream is = openGcsCredentialsStream(gcsJsonPath)) {
                    builder.setCredentials(GoogleCredentials.fromStream(is));
                }
            } else {
                builder.setCredentials(GoogleCredentials.getApplicationDefault());
            }

            return builder.build().getService();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to initialize GCS Storage. Check gcs.json.path=" + gcsJsonPath, e);
        }
    }

    private InputStream openGcsCredentialsStream(String path) throws IOException {
        if (path.startsWith("/")) {
            return new FileInputStream(path);
        }

        if (path.startsWith("classpath:")) {
            path = path.substring("classpath:".length());
        }

        return new ClassPathResource(path).getInputStream();
    }
}
