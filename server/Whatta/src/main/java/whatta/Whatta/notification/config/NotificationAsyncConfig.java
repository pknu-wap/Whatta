package whatta.Whatta.notification.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;

@Slf4j
@Configuration
public class NotificationAsyncConfig implements AsyncConfigurer {

    @Bean(name = "notiExecutor")
    public Executor notiExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(12);
        executor.setQueueCapacity(300);
        executor.setThreadNamePrefix("noti-executor-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.AbortPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }

    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (Throwable ex, Method method, Object... params) -> {
            Throwable cause = ex.getCause();
            boolean rejected = ex instanceof RejectedExecutionException
                    || ex instanceof TaskRejectedException
                    || cause instanceof RejectedExecutionException
                    || cause instanceof TaskRejectedException;

            if (rejected) {
                log.error("[ASYNC_REJECTED] async task was rejected. method={}, params={}",
                        method.getName(),
                        Arrays.toString(params),
                        ex);
                return;
            }

            log.error("[ASYNC_ERROR] uncaught async error. method={}, params={}",
                    method.getName(),
                    Arrays.toString(params),
                    ex);
        };
    }
}
