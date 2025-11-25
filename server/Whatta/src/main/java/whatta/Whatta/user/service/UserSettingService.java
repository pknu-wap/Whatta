package whatta.Whatta.user.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.global.util.LocalTimeUtil;
import whatta.Whatta.user.entity.ReminderNotiPreset;
import whatta.Whatta.user.entity.ScheduleSummaryNoti;
import whatta.Whatta.user.entity.UserSetting;
import whatta.Whatta.user.payload.request.ReminderNotiRequest;
import whatta.Whatta.user.payload.request.ScheduleSummaryNotiRequest;
import whatta.Whatta.user.payload.response.ReminderNotiResponse;
import whatta.Whatta.user.payload.response.ScheduleSummaryNotiResponse;
import whatta.Whatta.user.repository.UserSettingRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class UserSettingService {

    private final UserSettingRepository userSettingRepository;

    public ReminderNotiResponse createReminder(String userId, ReminderNotiRequest request) {
        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        //중복 확인
        if(alreadyExists(userSetting.getReminderNotiPresets(), request))
            throw new RestApiException(ErrorCode.ALREADY_EXIST_REMINDER);

        List<ReminderNotiPreset> newPresets = new ArrayList<>(userSetting.getReminderNotiPresets());

        ReminderNotiPreset newPreset = buildReminderPreset(request);
        newPresets.add(newPreset);

        userSettingRepository.save(userSetting.toBuilder()
                .reminderNotiPresets(newPresets)
                .build());

        return buildReminderResponse(newPreset);
    }
    private ReminderNotiPreset buildReminderPreset(ReminderNotiRequest request) {
        return ReminderNotiPreset.builder()
                .day(request.day())
                .hour(request.hour())
                .minute(request.minute())
                .build();
    }

    public List<ReminderNotiResponse> getReminders(String userId) {
        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        if(userSetting.getReminderNotiPresets() == null || userSetting.getReminderNotiPresets().isEmpty())
            return null;

        return userSetting.getReminderNotiPresets().stream()
                .map(this::buildReminderResponse)
                .collect(Collectors.toList());
    }

    public void updateReminder(String userId, String reminderId, ReminderNotiRequest request) {
        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        validatePresetInUserSetting(userSetting.getReminderNotiPresets(), reminderId);
        //중복 확인
        if(alreadyExists(userSetting.getReminderNotiPresets(), request))
            throw new RestApiException(ErrorCode.ALREADY_EXIST_REMINDER);

        List<ReminderNotiPreset> newPresets = new ArrayList<>();
        for(ReminderNotiPreset preset : userSetting.getReminderNotiPresets()) {
            if(preset.getId().equals(reminderId)) {
                newPresets.add(preset.toBuilder()
                        .day(request.day())
                        .hour(request.hour())
                        .minute(request.minute())
                        .build());
            } else newPresets.add(preset);
        }
        userSettingRepository.save(userSetting.toBuilder()
                .reminderNotiPresets(newPresets)
                .build());
    }

    @Transactional
    public void deleteReminders(String userId, List<String> reminderIds) {
        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        for(String presetId : reminderIds) {
            validatePresetInUserSetting(userSetting.getReminderNotiPresets(), presetId);
        }

        List<ReminderNotiPreset> updatedPresets = userSetting.getReminderNotiPresets().stream()
                .filter(preset -> !reminderIds.contains(preset.getId()))
                .collect(Collectors.toList());

        userSettingRepository.save(userSetting.toBuilder()
                .reminderNotiPresets(updatedPresets)
                .build());
    }

    private boolean alreadyExists(List<ReminderNotiPreset> userPresets, ReminderNotiRequest request) {
        return userPresets.stream()
                .anyMatch(preset ->
                        preset.getDay() == request.day()
                                && preset.getHour() == request.hour()
                                && preset.getMinute() == request.minute());
    }

    private ReminderNotiResponse buildReminderResponse(ReminderNotiPreset preset) {
        return ReminderNotiResponse.builder()
                .id(preset.getId())
                .day(preset.getDay())
                .hour(preset.getHour())
                .minute(preset.getMinute())
                .build();
    }

    private void validatePresetInUserSetting(List<ReminderNotiPreset> userPresets, String presetId) {
        if(userPresets.stream().noneMatch(p -> p.getId().equals(presetId)))
            throw new RestApiException(ErrorCode.REMINDER_NOT_FOUND);
    }

    //-------------일정 요약 알림----------------
    public void updateSummaryNoti(String userId, ScheduleSummaryNotiRequest request) {
        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        //TODO: 운영 서버에서는 지워도 됨(개발 서버에는 안들어가 있는 값들이 있어서)
        if (userSetting.getScheduleSummaryNoti() == null) {
            userSetting.toBuilder()
                    .scheduleSummaryNoti(ScheduleSummaryNoti.builder().build())
                    .build();
        }

        ScheduleSummaryNoti.ScheduleSummaryNotiBuilder builder = userSetting.getScheduleSummaryNoti().toBuilder();
        if(request.enabled() != null) builder.enabled(request.enabled());
        if(request.notifyDay() != null) builder.notifyDay(request.notifyDay());
        if(request.time() != null) builder.time(LocalTimeUtil.stringToLocalTime(request.time()));

        userSettingRepository.save(userSetting.toBuilder()
                .scheduleSummaryNoti(builder.build())
                .build());
    }

    public ScheduleSummaryNotiResponse getSummaryNoti(String userId) {
        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        return ScheduleSummaryNotiResponse.builder()
                .enabled(userSetting.getScheduleSummaryNoti().isEnabled())
                .notifyDay(userSetting.getScheduleSummaryNoti().getNotifyDay())
                .time(LocalTimeUtil.localTimeToString(userSetting.getScheduleSummaryNoti().getTime()))
                .build();
    }
}
