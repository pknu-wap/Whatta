package whatta.Whatta.global.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

@Slf4j
@Configuration
public class FirebaseConfig {

    @Value("${firebase.json.path}")
    private String firebaseJsonPath;

    @Bean
    public FirebaseApp firebaseApp() {

        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }

        try (InputStream is = openFirebaseCredentialsStream(firebaseJsonPath)) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(is))
                    .build();
            return FirebaseApp.initializeApp(options);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to initialize FirebaseApp. Check firebase.json.path=" + firebaseJsonPath, e);
        }
    }

    @Bean
    public FirebaseMessaging firebaseMessaging(FirebaseApp firebaseApp) {
        return FirebaseMessaging.getInstance(firebaseApp);
    }

    private InputStream openFirebaseCredentialsStream(String path) throws IOException {
        if (path == null || path.isBlank()) {
            throw new IllegalStateException("firebase.json.path is empty");
        }

        if (path.startsWith("/")) {//배포섭에서 사용
            return new FileInputStream(path);
        }

        if (path.startsWith("classpath:")) { //로컬섭에서 사용
            path = path.substring("classpath:".length());
        }

        return new ClassPathResource(path).getInputStream();
    }
}
