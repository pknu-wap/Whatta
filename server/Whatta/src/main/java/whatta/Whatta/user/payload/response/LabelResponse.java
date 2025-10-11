package whatta.Whatta.user.payload.response;

import lombok.Builder;

@Builder
public record LabelResponse(
        Long id,
        String title,
        String colorKey
) {
}
