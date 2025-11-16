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

import java.io.IOException;

@Slf4j
@Configuration
public class FirebaseConfig {

    @Value("firebase/firebase.json")
    private String FIREBASE_PATH;

    @Bean
    public FirebaseApp firebaseApp() {
        log.info("Firebase config path: {}", FIREBASE_PATH); //주입된 경로 확인

        if (!FirebaseApp.getApps().isEmpty()) {
            log.info("FirebaseApp already initialized. Reusing existing instance.");
            return FirebaseApp.getInstance();
        }

        try {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(new ClassPathResource(FIREBASE_PATH).getInputStream())
                    )
                    .build();
            return FirebaseApp.initializeApp(options);
        } catch (IOException e) {
            log.error("Fail to  initializing firebase app", e);
            return null;
        }
    }

    @Bean
    public FirebaseMessaging firebaseMessaging(FirebaseApp firebaseApp) {
        return FirebaseMessaging.getInstance(firebaseApp);
    }
}
