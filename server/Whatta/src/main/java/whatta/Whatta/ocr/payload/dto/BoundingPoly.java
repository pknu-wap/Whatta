package whatta.Whatta.ocr.payload.dto;

import lombok.Builder;

import java.util.List;

@Builder
public record BoundingPoly(
        List<Vertex> vertices
) {
    @Builder
    public record Vertex(
            double x,
            double y
    ) {}
}
