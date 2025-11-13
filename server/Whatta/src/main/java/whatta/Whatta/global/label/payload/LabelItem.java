package whatta.Whatta.global.label.payload;

import lombok.Builder;

@Builder
public record LabelItem(
        Long id,
        String title
        //String colorKey
) {
}
