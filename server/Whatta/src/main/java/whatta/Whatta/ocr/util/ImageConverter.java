package whatta.Whatta.ocr.util;

import org.opencv.core.Mat;
import org.opencv.core.MatOfByte;
import org.opencv.imgcodecs.Imgcodecs;

import java.util.Base64;

public class ImageConverter {

    public static Mat fromBase64(String imageData) {
        if(imageData == null) throw new IllegalArgumentException("Image data is null or empty");

        byte[] bytes = Base64.getDecoder().decode(imageData);
        MatOfByte matOfByte = new MatOfByte(bytes);

        Mat image = Imgcodecs.imdecode(matOfByte, Imgcodecs.IMREAD_COLOR); //BGR
        matOfByte.release(); //네이티브 버퍼 해제

        if (image == null || image.empty()) throw new IllegalArgumentException("imdecode failed (invalid image bytes)");
        return image;
    }
}
