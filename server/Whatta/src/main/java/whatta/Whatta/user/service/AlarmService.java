package whatta.Whatta.user.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.global.util.LocalTimeUtil;
import whatta.Whatta.user.entity.ReminderPreset;
import whatta.Whatta.user.entity.ScheduleSummary;
import whatta.Whatta.user.entity.UserSetting;
import whatta.Whatta.user.payload.request.ReminderRequest;
import whatta.Whatta.user.payload.request.ScheduleSummaryAlarmRequest;
import whatta.Whatta.user.payload.response.ReminderResponse;
import whatta.Whatta.user.payload.response.ScheduleSummaryResponse;
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

    @Transactional
    public void deleteReminders(String userId, List<String> reminderIds) {
        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        for(String presetId : reminderIds) {
            validatePresetInUserSetting(userSetting.getReminderPresets(), presetId);
        }

        List<ReminderPreset> updatedPresets = userSetting.getReminderPresets().stream()
                .filter(preset -> !reminderIds.contains(preset.getId()))
                .collect(Collectors.toList());

        userSettingRepository.save(userSetting.toBuilder()
                .reminderPresets(updatedPresets)
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

    //-------------일정 요약 알림----------------
    public void updateSummaryAlarm(String userId, ScheduleSummaryAlarmRequest request) {
        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        //TODO: 운영 서버에서는 지워도 됨(개발 서버에는 안들어가 있는 값들이 있어서)
        if (userSetting.getScheduleSummary() == null) {
            userSetting.toBuilder()
                    .scheduleSummary(ScheduleSummary.builder().build())
                    .build();
        }

        ScheduleSummary.ScheduleSummaryBuilder builder = userSetting.getScheduleSummary().toBuilder();
        if(request.enabled() != null) builder.enabled(request.enabled());
        if(request.notifyDay() != null) builder.notifyDay(request.notifyDay());
        if(request.time() != null) builder.time(LocalTimeUtil.stringToLocalTime(request.time()));

        userSettingRepository.save(userSetting.toBuilder()
                .scheduleSummary(builder.build())
                .build());
    }

    public ScheduleSummaryResponse getSummaryAlarm(String userId) {
        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        return ScheduleSummaryResponse.builder()
                .enabled(userSetting.getScheduleSummary().isEnabled())
                .notifyDay(userSetting.getScheduleSummary().getNotifyDay())
                .time(LocalTimeUtil.localTimeToString(userSetting.getScheduleSummary().getTime()))
                .build();
    }
}
