package whatta.Whatta.user.account.service;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import whatta.Whatta.global.security.JwtTokenProvider;
import whatta.Whatta.user.setting.entity.ScheduleSummaryNoti;
import whatta.Whatta.user.account.entity.User;
import whatta.Whatta.user.setting.entity.UserSetting;
import whatta.Whatta.user.plan.entity.UserPlan;
import whatta.Whatta.user.account.payload.response.LoginResponse;
import whatta.Whatta.user.account.repository.UserRepository;
import whatta.Whatta.user.plan.repository.UserPlanRepository;
import whatta.Whatta.user.setting.repository.UserSettingRepository;

import java.time.LocalTime;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserSettingRepository userSettingRepository;
    private final UserPlanRepository userPlanRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public LoginResponse processGuestLogin(String installationId) {
        //해당 installationId를 가진 유저를 확인하고 없으면 새로 생성
        User user = userRepository.findByInstallationId(installationId).orElseGet(() -> {

            User newUser = User.builder()
                    .installationId(installationId)
                    .build();
            userRepository.save(newUser);

            LocalTime defaultSummaryTime = LocalTime.of(9,0).truncatedTo(ChronoUnit.MINUTES);
            UserSetting setting = UserSetting.builder()
                    .userId(newUser.getId())
                    .scheduleSummaryNoti(ScheduleSummaryNoti.builder()
                            .time(defaultSummaryTime)
                            .minuteOfDay(toMinuteOfDay(defaultSummaryTime))
                            .build())
                    .build();
            userSettingRepository.save(setting);

            return newUser;
        });

        ensureUserPlan(user.getId());
        //각각 토큰 발급
        String accessToken = jwtTokenProvider.createAccessToken(user.getId());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());

        //refresh토큰 저장
        user.updateRefreshToken(refreshToken);
        userRepository.save(user);

        return new LoginResponse(accessToken, refreshToken);
    }

    private int toMinuteOfDay(LocalTime time) {
        return time.getHour() * 60 + time.getMinute();
    }

    private void ensureUserPlan(String userId) {
        userPlanRepository.findByUserId(userId)
                .orElseGet(() -> createUserPlanSafely(userId));
    }

    private UserPlan createUserPlanSafely(String userId) {
        try {
            return userPlanRepository.save(UserPlan.builder()
                    .userId(userId)
                    .build());
        } catch (DuplicateKeyException e) {
            return userPlanRepository.findByUserId(userId)
                    .orElseThrow(() -> e);
        }
    }
}
