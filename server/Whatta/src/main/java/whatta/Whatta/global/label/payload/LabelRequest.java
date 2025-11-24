package whatta.Whatta.global.label.payload;

import jakarta.validation.constraints.NotBlank;

public record LabelRequest(
        @NotBlank
        String title
        /*@NotBlank
        String colorKey*/
) {
}
