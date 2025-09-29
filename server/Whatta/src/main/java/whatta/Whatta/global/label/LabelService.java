package whatta.Whatta.global.label;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.user.entity.User;
import whatta.Whatta.user.entity.UserSetting;
import whatta.Whatta.user.repository.UserRepository;

import java.text.Collator;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@AllArgsConstructor
public class LabelService {

    private final UserRepository userRepository;

    public void createLabel(String userId, List<String> label) { //TODO: 추후 userId가 아닌 userDetails 받은 정보로 수정
        User user = userRepository.findByInstallationId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        List<String> labels = buildLabels(user.getUserSetting().getLabels(), label);
        UserSetting userSetting = user.getUserSetting().toBuilder()
                        .labels(labels)
                                .build();
        userRepository.save(user.toBuilder()
                .userSetting(userSetting)
                .build());
    }
    private List<String> buildLabels(List<String> userLabels, List<String> newLabels) {
        List<String> labels = new ArrayList<>(userLabels);

        //중복 제거
        for (String raw : newLabels) {
            if (raw == null) continue;

            String label = raw.trim();
            if (label.isEmpty()) continue;

            if (labels.stream().anyMatch(l -> l.equalsIgnoreCase(label))) {
                continue;
            }
            labels.add(label);
        }

        //정렬
        Collator collator = Collator.getInstance(Locale.KOREAN);
        collator.setStrength(Collator.PRIMARY);
        labels.sort(collator);

        return labels;
    }

    public List<String> getLabels(String userId) { //TODO: 추후 수정
        User user = userRepository.findByInstallationId(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        if(user.getUserSetting() == null || user.getUserSetting().getLabels() == null || user.getUserSetting().getLabels().isEmpty()) {
            return null;
        }

        return new ArrayList<>(user.getUserSetting().getLabels());
    }
}
