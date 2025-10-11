package whatta.Whatta.global.label.payload;

import lombok.Builder;
import whatta.Whatta.global.label.Label;

import java.util.ArrayList;
import java.util.List;

@Builder
public record LabelsResponse(
        List<LabelItem> labels
) {
    public static LabelsResponse fromEntity(List<Label> labels) { //TODO: 리팩토링 예정
        if(labels == null || labels.isEmpty()) return null;
        List<LabelItem> items = new ArrayList<>();
        for(Label label : labels) {
            items.add(LabelItem.builder()
                    .id(label.getId())
                    .title(label.getTitle())
                    .colorKey(label.getColorKey())
                    .build());
        }
        return new LabelsResponse(items);
    }

}
