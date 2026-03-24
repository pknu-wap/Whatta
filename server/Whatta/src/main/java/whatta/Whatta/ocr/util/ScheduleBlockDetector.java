package whatta.Whatta.ocr.util;

import java.util.ArrayList;
import java.util.List;

import org.bytedeco.opencv.opencv_core.*;
import static org.bytedeco.opencv.global.opencv_core.*;
import static org.bytedeco.opencv.global.opencv_imgproc.*;

import org.opencv.imgproc.Imgproc;
import org.springframework.stereotype.Component;
import whatta.Whatta.ocr.mapper.ScheduleBlockMapper;
import whatta.Whatta.ocr.payload.dto.DetectedBlock;

@Component
public class ScheduleBlockDetector {

    private static final double COLOR_VIVIDNESS_S_GAMMA = 0.55; //선명도 보정을 위한 감마(1보다 작을수록 끌어올림)
    private static final double COLOR_VIVIDNESS_V_GAMMA = 0.92;
    private static final double LIGHT_MODE_V_THRESHOLD_SCALE = 0.7;
    private static final double DARK_MODE_V_THRESHOLD_SCALE = 0.3; //다크모드일 때 라이트모드보다 임계점을 더 낮춤
    private static final int LIGHT_MODE_V_THRESHOLD_MIN = 80;
    private static final int DARK_MODE_V_THRESHOLD_MIN = 40;

    public DetectedBlock findTimeBox (String imageData) {
        //TODO: imageData 검증 필요
        Mat bgrImage = ImageIOUtil.fromBase64(imageData);
        try {
            return detectColoredBoxes(bgrImage);
        } finally {
            bgrImage.release(); //네이티브 메모리 해제
        }
    }

    private DetectedBlock detectColoredBoxes (Mat bgrImage) {
        Mat gray = new Mat();
        cvtColor(bgrImage, gray, COLOR_BGR2GRAY);
        Scalar gMean = mean(gray);
        boolean darkMode = gMean.get(0) < 70; //평균 밝기가 낮으면 다크모드로 간주

        //색 선명도 높임
        Mat vividBgr = new Mat();
        applyColorVividnessApproximation(bgrImage, vividBgr);

        //다크모드라면 전체 이미지를 반전해서, 흰 배경 기준으로 처리
        Mat workBgr = new Mat();
        if (darkMode) {
            bitwise_not(vividBgr, workBgr); //검은 배경 → 흰 배경, 밝은 글자 → 어두운 글자
        } else {
            workBgr = vividBgr.clone();
        }
        gray.release();

        //살짝 블러 (문자/격자 얇은 라인 완화)
        Mat smooth = new Mat();
        GaussianBlur(workBgr, smooth, new Size(3, 3), 0);

        //HSV로 변환
        Mat hsv = new Mat();
        cvtColor(smooth, hsv, COLOR_BGR2HSV);

        //채널 분리
        MatVector hsvSplit = new MatVector();
        split(hsv, hsvSplit);
        Mat S = hsvSplit.get(1), V = hsvSplit.get(2); //S = 채도, V = 명도와 밝기

        //S채널 Otsu (색이 있는 영역 자동 선택)
        Mat sMask = new Mat();
        threshold(S, sMask, 0, 255, THRESH_BINARY | THRESH_OTSU);

        //V채널 하한
        Mat vMask = new Mat();
        Mat vOtsuProbe = new Mat();
        double vOtsu = threshold(V, vOtsuProbe, 0, 255, THRESH_BINARY | THRESH_OTSU);
        double vThreshold = darkMode
                ? Math.max(DARK_MODE_V_THRESHOLD_MIN, vOtsu * DARK_MODE_V_THRESHOLD_SCALE)
                : Math.max(LIGHT_MODE_V_THRESHOLD_MIN, vOtsu * LIGHT_MODE_V_THRESHOLD_SCALE);
        threshold(V, vMask, vThreshold, 255, THRESH_BINARY);

        //최종 마스크 S + V
        Mat mask = new Mat();
        bitwise_and(sMask, vMask, mask);

        //모폴로지 OPEN -> CLOSE (사각형 붙음 방지 후 구멍 및 텍스트 메우기)
        morphologyRefine(mask);

        //컨투어 -> 사각 근사/보정 -> 네 점 정렬 -> dto로 변환
        List<DetectedBlock.Block> blocks = extractBoxesAsResults(mask, bgrImage.size());

        //리소스 해제
        smooth.release(); hsv.release();
        S.release(); V.release();
        sMask.release(); vMask.release(); vOtsuProbe.release(); mask.release();
        vividBgr.release();
        workBgr.release();

        return ScheduleBlockMapper.toDetectedBlock(bgrImage.size(), blocks);
    }

    private void applyColorVividnessApproximation(Mat sourceBgr, Mat destinationBgr) {
        Mat hsv = new Mat();
        cvtColor(sourceBgr, hsv, COLOR_BGR2HSV);

        MatVector hsvSplit = new MatVector();
        split(hsv, hsvSplit);
        Mat vividS = new Mat();
        Mat vividV = new Mat();
        Mat sTable = buildGammaTable(COLOR_VIVIDNESS_S_GAMMA);
        Mat vTable = buildGammaTable(COLOR_VIVIDNESS_V_GAMMA);
        LUT(hsvSplit.get(1), sTable, vividS);
        LUT(hsvSplit.get(2), vTable, vividV);
        vividS.copyTo(hsvSplit.get(1));
        vividV.copyTo(hsvSplit.get(2));
        merge(hsvSplit, hsv);
        cvtColor(hsv, destinationBgr, COLOR_HSV2BGR);

        hsvSplit.get(0).release();
        hsvSplit.get(1).release();
        hsvSplit.get(2).release();
        hsvSplit.close();
        vividS.release();
        vividV.release();
        sTable.release();
        vTable.release();
        hsv.release();
    }

    //감마 값 변환 테이블(약한 채도 값을 더 큰 값으로 올려줌)
    private Mat buildGammaTable(double gamma) {
        Mat lut = new Mat(1, 256, CV_8U);
        byte[] values = new byte[256];
        for (int i = 0; i < 256; i++) {
            int adjusted = (int) Math.round(255.0 * Math.pow(i / 255.0, gamma));
            values[i] = (byte) Math.max(0, Math.min(255, adjusted));
        }
        lut.data().put(values);
        return lut;
    }

    private void morphologyRefine(Mat mask) {
        Mat kOpen  = getStructuringElement(MORPH_RECT, new Size(3, 3));
        //Mat kClose = getStructuringElement(MORPH_RECT, new Size(3, 3));

        morphologyEx(mask, mask, Imgproc.MORPH_OPEN,  kOpen);
        //morphologyEx(mask, mask, Imgproc.MORPH_CLOSE, kClose);

        kOpen.release(); //kClose.release();
    }

    private List<DetectedBlock.Block> extractBoxesAsResults(Mat mask, Size originalSize) {
        MatVector contours = new MatVector();
        findContours(mask.clone(), contours, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE);

        int minArea = Math.max(600, ((originalSize.height() * originalSize.width()) / 12000)); //해상도 기반 최소 면적
        int idx = 0;

        List<DetectedBlock.Block> blocks = new ArrayList<>();
        for (long i = 0; i < contours.size(); i++) {
            Mat c = contours.get(i);
            double area = contourArea(c);
            if (area < minArea) continue;

            //회전사각형 사용 → 항상 네 점 확보
            Mat c2f = new Mat();
            c.convertTo(c2f, CV_32FC2);
            RotatedRect rr = minAreaRect(c2f);

            Point2f pts = new Point2f(4);
            rr.points(pts); //4개 꼭짓점 채움

            Point[] box = new Point[4];
            for (int k=0;k<4;k++){
                Point2f p = pts.position(k);
                box[k] = new Point(Math.round(p.x()), Math.round(p.y()));
            }
            //topLeft, tr, br, bl 순서로 정렬
            Point[] ordered = orderTLTRBRBL(box);

            blocks.add(ScheduleBlockMapper.toBlock(++idx, ordered[0], ordered[1], ordered[2], ordered[3]));

            c2f.release(); rr.close(); pts.close();
        }
        contours.close();
        return blocks;
    }

    //topLeft, tr, br, bl 순서로 정렬
    private Point[] orderTLTRBRBL(Point[] p) {
        Point tl = null, tr = null, br = null, bl = null;
        double minSum=1e18, maxSum=-1e18, minDiff=1e18, maxDiff=-1e18;

        for (Point pt : p) {
            double s = pt.x() + pt.y(); //최소=tl, 최대=br
            double d = pt.y() - pt.x(); //최소=tr, 최대=bl
            if (s < minSum) { minSum = s; tl = pt; }
            if (s > maxSum) { maxSum = s; br = pt; }
            if (d < minDiff) { minDiff = d; tr = pt; }
            if (d > maxDiff) { maxDiff = d; bl = pt; }
        }
        return new Point[]{tl, tr, br, bl};
    }
}
