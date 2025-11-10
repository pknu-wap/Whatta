package whatta.Whatta.ocr.mapper;

import org.bytedeco.opencv.opencv_core.Point;
import org.bytedeco.opencv.opencv_core.Size;
import whatta.Whatta.ocr.payload.dto.BoundingPoly;
import whatta.Whatta.ocr.payload.dto.DetectedBlock;

import java.util.List;

public class ScheduleBlockMapper {

    public static BoundingPoly.Vertex toVertex (Point p) {
        if (p == null) return null;
        return BoundingPoly.Vertex.builder()
                .x(p.x())
                .y(p.y())
                .build();
    }

    public static DetectedBlock.Block toBlock (int id, Point tl, Point tr, Point br, Point bl) {
        BoundingPoly.Vertex vTL = toVertex(tl);
        BoundingPoly.Vertex vTR = toVertex(tr);
        BoundingPoly.Vertex vBR = toVertex(br);
        BoundingPoly.Vertex vBL = toVertex(bl);
        return DetectedBlock.Block.builder()
                .id(id)
                .tl(vTL).tr(vTR).br(vBR).bl(vBL)
                .build();
    }
    public static DetectedBlock toDetectedBlock(Size imageSize, List<DetectedBlock.Block> blocks) {

        return DetectedBlock.builder()
                .imageWidth(imageSize.width())
                .imageHeight(imageSize.height())
                .blocks(blocks)
                .build();
    }

}
