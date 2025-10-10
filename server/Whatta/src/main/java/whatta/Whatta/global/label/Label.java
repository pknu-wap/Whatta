package whatta.Whatta.global.label;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Builder
public class Label {

        @NotNull
        private Long id;

        @NotBlank
        private String title;

        @NotBlank
        private String colorKey;
}
