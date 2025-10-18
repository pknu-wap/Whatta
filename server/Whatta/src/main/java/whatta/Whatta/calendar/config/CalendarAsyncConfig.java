package whatta.Whatta.calendar.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
public class CalendarAsyncConfig {

    @Bean
    public Executor calendarExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(8); //코어 스레드 수
        executor.setMaxPoolSize(16); //최대 스레드 수
        executor.setQueueCapacity(200); //대기 큐 용량
        executor.setThreadNamePrefix("calendar-executor-");
        executor.initialize();
        return executor;
    }
}
