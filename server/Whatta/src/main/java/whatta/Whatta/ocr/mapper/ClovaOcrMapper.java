package whatta.Whatta.ocr.mapper;

import whatta.Whatta.ocr.payload.dto.BoundingPoly;
import whatta.Whatta.ocr.payload.dto.OcrText;
import whatta.Whatta.ocr.payload.response.ClovaOcrResponse;

import java.util.ArrayList;
import java.util.List;

public class ClovaOcrMapper {

    public static List<OcrText> toOcrTextList(ClovaOcrResponse response) {
        List<OcrText> results = new ArrayList<>();
        if (response == null || response.images() == null) return results;

        for (ClovaOcrResponse.OcrResponseImage image : response.images()) {
            if (image == null || image.fields() == null) continue;

            for (ClovaOcrResponse.OcrField field : image.fields()) {
                if (field == null || field.inferText() == null || field.inferText().isBlank()) continue;
                BoundingPoly poly = field.boundingPoly();
                if (poly == null || poly.vertices() == null || poly.vertices().size() < 4) continue;

                var v = poly.vertices(); //4개의 꼭짓점 순서는 clova 응답에서 이미 정렬되어 있음
                BoundingPoly.Vertex tl = v.get(0);
                BoundingPoly.Vertex tr = v.get(1);
                BoundingPoly.Vertex br = v.get(2);
                BoundingPoly.Vertex bl = v.get(3);

                OcrText ocrText = new OcrText(field.inferText(), tl, tr, br, bl);
                results.add(ocrText);
            }
        }
        return results;
    }
}
