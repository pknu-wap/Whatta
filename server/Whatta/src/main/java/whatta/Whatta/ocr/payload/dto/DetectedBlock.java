package whatta.Whatta.ocr.payload.dto;

import lombok.Builder;

import java.util.List;

@Builder
public record DetectedBlock(
        int imageWidth, //이미지 크기
        int imageHeight,

        List<Block> blocks
) {
    @Builder
    public record Block(
            int id,
            BoundingPoly.Vertex tl,
            BoundingPoly.Vertex tr,
            BoundingPoly.Vertex br,
            BoundingPoly.Vertex bl
    ) {}
}
