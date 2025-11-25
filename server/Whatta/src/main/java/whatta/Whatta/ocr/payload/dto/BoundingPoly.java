package whatta.Whatta.ocr.payload.dto;

import lombok.Builder;

import java.util.List;

@Builder
public record BoundingPoly(
        List<Vertex> vertices
) {
    @Builder
    public record Vertex(
            int x,
            int y
    ) {}
}
