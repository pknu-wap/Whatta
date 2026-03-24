package whatta.Whatta.ocr.util;

import org.junit.jupiter.api.Test;
import whatta.Whatta.ocr.payload.dto.DetectedBlock;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

class ScheduleBlockDetectorTest {

    private final ScheduleBlockDetector detector = new ScheduleBlockDetector();

    @Test
    void findTimeBoxDetectsPastelBlockInDarkMode() throws Exception {
        BufferedImage image = new BufferedImage(1179, 1478, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        try {
            graphics.setColor(new Color(22, 22, 22));
            graphics.fillRect(0, 0, image.getWidth(), image.getHeight());

            graphics.setColor(new Color(225, 221, 188));
            graphics.fillRect(950, 120, 180, 520);
        } finally {
            graphics.dispose();
        }

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        String imageData = Base64.getEncoder().encodeToString(output.toByteArray());

        DetectedBlock detectedBlock = detector.findTimeBox(imageData);

        assertThat(detectedBlock.blocks()).isNotEmpty();
    }
}
