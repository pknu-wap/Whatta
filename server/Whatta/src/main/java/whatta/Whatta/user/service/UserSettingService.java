package whatta.Whatta.user.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.global.label.Label;
import whatta.Whatta.global.label.payload.LabelItem;
import whatta.Whatta.global.label.payload.LabelRequest;
import whatta.Whatta.global.label.payload.LabelsResponse;
import whatta.Whatta.user.entity.UserSetting;
import whatta.Whatta.user.repository.UserSettingRepository;

import java.text.Collator;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@AllArgsConstructor
public class UserSettingService {

    private final UserSettingRepository userSettingRepository;

    public void createLabel(String userId, LabelRequest request) { //TODO: 추후 userId가 아닌 userDetails 받은 정보로 수정
        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST)); //TODO: userSetting not found로 변경

        List<Label> newLabels = buildLabels(userSetting.getLabels(), request);
        userSettingRepository.save(userSetting.toBuilder()
                .labels(newLabels)
                .build());
    }
    private List<Label> buildLabels(List<Label> userLabels, LabelRequest request) {
        List<Label> newLabels = new ArrayList<>(userLabels);

        //중복 제거
        if(request == null) return newLabels;

        String label = request.title().trim();
        if(newLabels.stream().anyMatch(l -> l.getTitle().equalsIgnoreCase(label))) {
            newLabels.add(Label.builder()
                            .title(label)
                            .colorKey(request.colorKey())
                    .build());
        }

        //라벨의 개수 제한
        if(newLabels.size() > 10)
            throw new RestApiException(ErrorCode.TOO_MANY_LABELS);

        //정렬
        Collator collator = Collator.getInstance(Locale.KOREAN);
        collator.setStrength(Collator.PRIMARY);
        newLabels.sort(collator);

        return newLabels;
    }

    public LabelsResponse getLabels(String userId) { //TODO: 추후 수정
        UserSetting userSetting = userSettingRepository.findByUserId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST)); //TODO: userSetting not found로 변경

        if(userSetting == null || userSetting.getLabels() == null || userSetting.getLabels().isEmpty()) {
            return null;
        }

        List<LabelItem> labels = new ArrayList<>();
        for(Label label : userSetting.getLabels()) {
            labels.add(LabelItem.builder()
                            .title(label.getTitle())
                            .colorkey(label.getColorKey())
                    .build());
        }

        return LabelsResponse.builder()
                .labels(labels)
                .build();
    }

}
