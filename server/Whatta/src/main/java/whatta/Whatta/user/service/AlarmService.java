package whatta.Whatta.user.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.user.entity.ReminderPreset;
import whatta.Whatta.user.entity.UserSetting;
import whatta.Whatta.user.payload.request.ReminderRequest;
import whatta.Whatta.user.payload.response.ReminderResponse;
import whatta.Whatta.user.repository.UserSettingRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class AlarmService {

    private final UserSettingRepository userSettingRepository;

    public ReminderResponse createReminder(String userId, ReminderRequest request) {
        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        //중복 확인
        if(alreadyExists(userSetting.getReminderPresets(), request))
            throw new RestApiException(ErrorCode.ALREADY_EXIST_REMINDER);

        List<ReminderPreset> newPresets = new ArrayList<>(userSetting.getReminderPresets());

        ReminderPreset newPreset = buildReminderPreset(request);
        newPresets.add(newPreset);

        userSettingRepository.save(userSetting.toBuilder()
                .reminderPresets(newPresets)
                .build());

        return buildReminderResponse(newPreset);
    }
    private ReminderPreset buildReminderPreset(ReminderRequest request) {
        return ReminderPreset.builder()
                .day(request.day())
                .hour(request.hour())
                .minute(request.minute())
                .build();
    }

    public List<ReminderResponse> getReminders(String userId) {
        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        if(userSetting.getReminderPresets() == null || userSetting.getReminderPresets().isEmpty())
            return null;

        return userSetting.getReminderPresets().stream()
                .map(this::buildReminderResponse)
                .collect(Collectors.toList());
    }

    public void updateReminder(String userId, String reminderId, ReminderRequest request) {
        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        validatePresetInUserSetting(userSetting.getReminderPresets(), reminderId);
        //중복 확인
        if(alreadyExists(userSetting.getReminderPresets(), request))
            throw new RestApiException(ErrorCode.ALREADY_EXIST_REMINDER);

        List<ReminderPreset> newPresets = new ArrayList<>();
        for(ReminderPreset preset : userSetting.getReminderPresets()) {
            if(preset.getId().equals(reminderId)) {
                newPresets.add(preset.toBuilder()
                        .day(request.day())
                        .hour(request.hour())
                        .minute(request.minute())
                        .build());
            } else newPresets.add(preset);
        }
        userSettingRepository.save(userSetting.toBuilder()
                .reminderPresets(newPresets)
                .build());
    }

    private boolean alreadyExists(List<ReminderPreset> userPresets, ReminderRequest request) {
        return userPresets.stream()
                .anyMatch(preset ->
                        preset.getDay() == request.day()
                                && preset.getHour() == request.hour()
                                && preset.getMinute() == request.minute());
    }

    private ReminderResponse buildReminderResponse(ReminderPreset preset) {
        return ReminderResponse.builder()
                .id(preset.getId())
                .day(preset.getDay())
                .hour(preset.getHour())
                .minute(preset.getMinute())
                .build();
    }

    private void validatePresetInUserSetting(List<ReminderPreset> userPresets, String presetId) {
        if(userPresets.stream().noneMatch(p -> p.getId().equals(presetId)))
            throw new RestApiException(ErrorCode.REMINDER_NOT_FOUND);
    }


}
