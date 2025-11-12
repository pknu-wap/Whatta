package whatta.Whatta.opencv;

import org.junit.jupiter.api.Test;
import org.bytedeco.opencv.opencv_core.Mat;

import static org.bytedeco.opencv.global.opencv_core.CV_8UC3;
import static org.bytedeco.opencv.global.opencv_core.getBuildInformation;
import static org.junit.jupiter.api.Assertions.*;

class OpenCvSmokeTest {
    @Test
    void loadAndInfo() {
        Mat m = new Mat(10, 10, CV_8UC3);
        assertFalse(m.empty());
        String info = getBuildInformation().getString();
        assertNotNull(info);
        System.out.println(info);
    }
}
