package whatta.Whatta.global.label.payload;

import lombok.Builder;

import java.util.List;

@Builder
public record LabelsResponse(
        List<LabelItem> labels
) {
}
