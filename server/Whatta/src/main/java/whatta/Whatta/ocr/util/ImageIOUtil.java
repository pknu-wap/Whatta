package whatta.Whatta.ocr.util;
import org.bytedeco.opencv.opencv_core.*;

import static org.bytedeco.opencv.global.opencv_core.*;
import static org.bytedeco.opencv.global.opencv_imgcodecs.*;
import whatta.Whatta.ocr.payload.dto.BoundingPoly;
import whatta.Whatta.ocr.payload.dto.DetectedBlock;

import java.util.Base64;

public class ImageIOUtil {

    public static Mat fromBase64(String imageData) {
        if(imageData == null) throw new IllegalArgumentException("Image data is null or empty");

        byte[] bytes = Base64.getDecoder().decode(imageData);
        Mat buf = new Mat(1, bytes.length, CV_8U);
        buf.data().put(bytes);

        Mat image = imdecode(buf, IMREAD_COLOR); //BGR
        buf.release(); //네이티브 버퍼 해제

        if (image == null || image.empty()) throw new IllegalArgumentException("imdecode failed (invalid image bytes)");
        return image;
    }
}
