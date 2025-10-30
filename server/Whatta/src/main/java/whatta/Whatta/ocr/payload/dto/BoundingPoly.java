package whatta.Whatta.ocr.payload.dto;

import java.util.List;

public record BoundingPoly(
        List<Vertex> vertices
) {

    public record Vertex(
            double x,
            double y
    ) {}
}
