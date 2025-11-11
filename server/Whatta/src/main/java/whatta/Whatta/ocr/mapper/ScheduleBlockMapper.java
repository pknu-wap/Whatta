package whatta.Whatta.ocr.mapper;

import org.bytedeco.opencv.opencv_core.Point;
import org.bytedeco.opencv.opencv_core.Size;
import whatta.Whatta.ocr.payload.dto.BoundingPoly;
import whatta.Whatta.ocr.payload.dto.DetectedBlock;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

public class ScheduleBlockMapper {

    private static BoundingPoly.Vertex toVertex (Point p) {
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

    //-------------------매치된 결과 블럭을 response로 변환-----------------
    private static final Pattern CONTENT = Pattern.compile("^[A-Z][0-9].*$");

    //텍스트 토큰들을 순서대로 더하다가 "대문자 시작 + 숫자 포함" 토큰을 만나면 그 토큰부터 content로 보냄
    public static String[] splitTitleAndContent(List<String> texts) {
        if (texts == null || texts.isEmpty()) return new String[]{"", ""};
        List<String> titleTokens = new ArrayList<>();
        List<String> contentTokens = new ArrayList<>();
        boolean toContent = false;

        for (String raw : texts) {
            String t = raw == null ? "" : raw.trim();
            if (t.isEmpty()) continue;

            if (!toContent && CONTENT.matcher(t).matches()) {
                toContent = true; //이 시점부터 content
            }

            if (toContent) {
                contentTokens.add(t);
            }
            else { titleTokens.add(t); }
        }

        String title   = String.join("", titleTokens).trim();
        String content = String.join(", ", contentTokens).trim();
        return new String[]{title, content};
    }

}
