package whatta.Whatta.global.util;

import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.global.label.Label;
import whatta.Whatta.global.label.payload.LabelItem;
import whatta.Whatta.user.entity.UserSetting;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

public class LabelUtil {

    public static void validateLabelsInUserSettings(UserSetting userSetting, List<Long> labels) {
        List<Label> userLabels = new ArrayList<>(userSetting.getLabels());

        if(labels == null || labels.isEmpty()) {
            return;
        }

        for (long labelId : labels) {
            if(userLabels.stream().noneMatch(l -> l.getId() == labelId)) {
                throw new RestApiException(ErrorCode.LABEL_NOT_FOUND);
            }
        }
    }

    public static List<LabelItem> getTitleAndColorKeyByIdsForResponse(UserSetting userSetting, List<Long> labelIds) {
        if(labelIds == null || labelIds.isEmpty()) {
            return List.of();
        }

        Map<Long, Label> userLabels = userSetting.getLabels().stream()
                .collect(Collectors.toMap(Label::getId, Function.identity()));

        List<LabelItem> result = new ArrayList<>();
        for(Long id : labelIds) {
            Label label = userLabels.get(id);

            result.add(LabelItem.builder()
                    .id(label.getId())
                    .title(label.getTitle())
                    //.colorKey(label.getColorKey())
                    .build());
        }
        return result;
    }
}