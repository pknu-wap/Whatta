package whatta.Whatta.user.service;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.global.label.Label;
import whatta.Whatta.global.label.payload.LabelItem;
import whatta.Whatta.global.label.payload.LabelRequest;
import whatta.Whatta.global.label.payload.LabelsResponse;
import whatta.Whatta.global.util.LabelUtil;
import whatta.Whatta.user.entity.UserSetting;
import whatta.Whatta.user.payload.response.LabelResponse;
import whatta.Whatta.user.repository.UserSettingRepository;

import java.util.ArrayList;
import java.util.List;

@Service
@AllArgsConstructor
public class UserSettingService {

    private final UserSettingRepository userSettingRepository;

    public LabelResponse createLabel(String userId, LabelRequest request) {
        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        List<Label> newLabels = buildLabels(userSetting.getLabels(), request);
        userSettingRepository.save(userSetting.toBuilder()
                .labels(newLabels)
                .build());

        Label newLabel = findLabelByTitle(newLabels, request.title().trim());
        return LabelResponse.builder()
                .id(newLabel.getId())
                .title(newLabel.getTitle())
                //.colorKey(newLabel.getColorKey())
                .build();
    }
    private List<Label> buildLabels(List<Label> userLabels, LabelRequest request) {
        List<Label> newLabels = new ArrayList<>(userLabels);

        if(request == null) return newLabels;

        //중복 제거
        String label = request.title().trim();
        if(newLabels.stream().noneMatch(l -> l.getTitle().equalsIgnoreCase(label))) {
            newLabels.add(Label.builder()
                            .id(generateId(newLabels))
                            .title(label)
                            //.colorKey(request.colorKey())
                    .build());
        }

        //라벨의 개수 제한
        if(newLabels.size() > 10)
            throw new RestApiException(ErrorCode.TOO_MANY_LABELS);

        return newLabels;
    }
    private Long generateId(List<Label> labels) {
        return labels.stream()
                .mapToLong(Label::getId)
                .max()
                .orElse(0L) + 1L;
    }
    private Label findLabelByTitle(List<Label> labels, String title) {
        if(labels == null || labels.isEmpty())
            throw new RestApiException(ErrorCode.LABEL_NOT_FOUND);

        return labels.stream()
                .filter(l -> l.getTitle().equalsIgnoreCase(title.trim()))
                .findFirst()
                .orElseThrow(()-> new RestApiException(ErrorCode.LABEL_NOT_FOUND));
    }

    public LabelsResponse getLabels(String userId) {
        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        if(userSetting.getLabels() == null || userSetting.getLabels().isEmpty()) {
            return null;
        }

        List<LabelItem> labels = new ArrayList<>();
        for(Label label : userSetting.getLabels()) {
            labels.add(LabelItem.builder()
                            .id(label.getId())
                            .title(label.getTitle())
                            //.colorKey(label.getColorKey())
                    .build());
        }

        return LabelsResponse.builder()
                .labels(labels)
                .build();
    }

    public void updateLabel(String userId, Long labelId, LabelRequest request) {
        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        LabelUtil.validateLabelsInUserSettings(userSetting, List.of(labelId));

        List<Label> newLabels = updateLabels(userSetting.getLabels(), labelId, request);
        userSettingRepository.save(userSetting.toBuilder()
                .labels(newLabels)
                .build());
    }
    private List<Label> updateLabels(List<Label> userLabels, Long labelId, LabelRequest request) {
        List<Label> newLabels = new ArrayList<>();
        for(Label label : userLabels) {
            if(label.getId().equals(labelId)) {
                newLabels.add(label.toBuilder()
                        .title(request.title().trim())
                        .build());
            } else newLabels.add(label);
        }
        return newLabels;
    }


    @Transactional
    public void deleteLabels(String userId, List<Long> labelId) {
        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        LabelUtil.validateLabelsInUserSettings(userSetting, labelId);

        userSetting.deleteLabelsByIds(labelId);
        userSettingRepository.save(userSetting);

        //TODO: event/task에 해당 id 삭제
    }
}
