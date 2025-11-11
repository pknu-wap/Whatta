package whatta.Whatta.ocr.payload.dto;

public record OcrText(
        String text,

        BoundingPoly.Vertex tl,
        BoundingPoly.Vertex tr,
        BoundingPoly.Vertex br,
        BoundingPoly.Vertex bl
){
    public int centerX () { return (tl.x()+tr.x()+br.x()+bl.x())/4; }
    public int centerY () { return (tl.y()+tr.y()+br.y()+bl.y())/4; }
}
