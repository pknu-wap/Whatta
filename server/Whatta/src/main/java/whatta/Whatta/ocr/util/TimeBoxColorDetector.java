package whatta.Whatta.ocr.util;

import org.opencv.core.*;
import org.opencv.imgproc.Imgproc;
import whatta.Whatta.ocr.payload.dto.TimeBoxResult;

import java.util.ArrayList;
import java.util.List;

public class TimeBoxColorDetector {

    public static List<TimeBoxResult> findTimeBox (String imageData) {
        //TODO: imageData 검증

        Mat bgrImage = ImageConverter.fromBase64(imageData);
        try {
            return detectColoredBoxes(bgrImage);
        } finally {
            bgrImage.release(); //네이티브 메모리 해제
        }
    }

    private static List<TimeBoxResult> detectColoredBoxes (Mat bgrImage) {
        //살짝 블러 (문자/격자 얇은 라인 완화)
        Mat smooth = new Mat();
        Imgproc.GaussianBlur(bgrImage, smooth, new Size(3, 3), 0);

        //HSV
        Mat hsv = new Mat();
        Imgproc.cvtColor(smooth, hsv, Imgproc.COLOR_BGR2HSV);

        List<Mat> hsvSplit = new ArrayList<>(3);
        Core.split(hsv, hsvSplit);
        Mat S = hsvSplit.get(1), V = hsvSplit.get(2); //S = 채도, V = 명도와 밝기

        //S채널 Otsu (색이 있는 영역 자동 선택)
        Mat sMask = new Mat();
        Imgproc.threshold(S, sMask, 0, 255, Imgproc.THRESH_BINARY + Imgproc.THRESH_OTSU);

        //V 채널 조건부 하한 (다크모드면 완호 또는 비활성화)
        Scalar vMean = Core.mean(V);
        boolean darkMode = vMean.val[0] < 70; //평균 밝기가 낮으면 다크모드로 판단

        Mat vMask = new Mat();
        if (darkMode) {
            vMask = Mat.ones(V.size(), CvType.CV_8U); //V 필터 비활성화(모두 통과)
        } else {
            double vOtsu = Imgproc.threshold(V, new Mat(), 0, 255, Imgproc.THRESH_BINARY + Imgproc.THRESH_OTSU);
            Imgproc.threshold(V, vMask, Math.max(80, vOtsu*0.7), 255, Imgproc.THRESH_BINARY);
        }

        //BGR -> LAB & 크로마(=√((a-128)^2+(b-128)^2)) Otsu
        Mat lab = new Mat();
        Imgproc.cvtColor(smooth, lab, Imgproc.COLOR_BGR2Lab);

        List<Mat> labSplit = new ArrayList<>(3);
        Core.split(lab, labSplit);
        Mat a = labSplit.get(1), b = labSplit.get(2);

        //float 변환 + 중성점(128) 보정
        Mat a32 = new Mat(); a.convertTo(a32, CvType.CV_32F);
        Mat b32 = new Mat(); b.convertTo(b32, CvType.CV_32F);
        Core.subtract(a32, new Scalar(128.0), a32); // a' = a-128  // ★ 수정
        Core.subtract(b32, new Scalar(128.0), b32); // b' = b-128  // ★ 수정

        //크로마 = √(a'^2 + b'^2)
        Core.multiply(a32, a32, a32);
        Core.multiply(b32, b32, b32);
        Mat chroma = new Mat(a32.size(), CvType.CV_32F);
        Core.add(a32, b32, chroma);
        Core.sqrt(chroma, chroma);

        //0~255 정규화 후 Otsu
        Mat chroma8 = new Mat();
        Core.normalize(chroma, chroma8, 0, 255, Core.NORM_MINMAX, CvType.CV_8U);
        Mat cMask = new Mat();
        Imgproc.threshold(chroma8, cMask, 0, 255, Imgproc.THRESH_BINARY + Imgproc.THRESH_OTSU);

        //최종 마스크 S + Chroma + 조건부 V
        Mat mask = new Mat();
        Core.bitwise_and(sMask, cMask, mask);
        Core.bitwise_and(mask, vMask, mask);

        //수평/수직 라인만 뽑아서 마스크에서 제거(사각형 분리)
        removeGridLines(mask);

        //모폴로지 OPEN(3x3) -> CLOSE(7x7) (사각형 붙음 방지 후 구멍 및 텍스트 메우기)
        morphologyRefine(mask);

        //컨투어: 사각 근사/보정 -> 4점 정렬 -> dto로 변환
        List<TimeBoxResult> results = extractBoxesAsResults(mask, bgrImage.size());

        //리소스 해제
        smooth.release(); hsv.release(); lab.release();
        S.release(); V.release(); a.release(); b.release();
        a32.release(); b32.release(); chroma.release(); chroma8.release();
        sMask.release(); vMask.release(); cMask.release(); mask.release();

        return results;
    }

    /*
    격자선 제거 : 수평/수직 구조 요소 OPEN으로 라인을 추출하여 마스크에서 제외
    */
    private static void removeGridLines(Mat mask) {
        int hk = Math.max(15, mask.cols() / 60); //해상도 적응형 커널 길이(수평)
        int vk = Math.max(15, mask.rows() / 60); //해상도 적응형 커널 길이(수직)

        Mat kH = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, new Size(hk, 1));
        Mat kV = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, new Size(1, vk));

        Mat horiz = new Mat();
        Mat vert  = new Mat();

        Imgproc.morphologyEx(mask, horiz, Imgproc.MORPH_OPEN, kH); //수평 라인
        Imgproc.morphologyEx(mask, vert,  Imgproc.MORPH_OPEN, kV); //수직 라인

        Mat lines = new Mat(), linesInv = new Mat();
        Core.bitwise_or(horiz, vert, lines); //라인 합치기
        Core.bitwise_not(lines, linesInv); //라인 반전(제거용)
        Core.bitwise_and(mask, linesInv, mask); //마스크에서 라인 제거

        kH.release(); kV.release();
        horiz.release(); vert.release();
        lines.release(); linesInv.release();
    }

    private static void morphologyRefine(Mat mask) {
        Mat kOpen  = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, new Size(3, 3));
        Mat kClose = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, new Size(7, 7));

        Imgproc.morphologyEx(mask, mask, Imgproc.MORPH_OPEN,  kOpen,  new Point(-1, -1), 1);
        Imgproc.morphologyEx(mask, mask, Imgproc.MORPH_CLOSE, kClose, new Point(-1, -1), 1);

        kOpen.release(); kClose.release();
    }
    private static List<TimeBoxResult> extractBoxesAsResults(Mat mask, Size originalSize) {
        List<MatOfPoint> contours = new ArrayList<>();
        Imgproc.findContours(mask, contours, new Mat(), Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE);

        int minArea = Math.max(600, (int) ((originalSize.height * originalSize.width) / 12000)); // 해상도 기반 최소 면적
        List<TimeBoxResult> results = new ArrayList<>();
        int idx = 0;

        for (MatOfPoint c : contours) {
            double area = Imgproc.contourArea(c);
            if (area < minArea) continue;

            MatOfPoint2f c2f = new MatOfPoint2f(c.toArray());
            double peri = Imgproc.arcLength(c2f, true);
            MatOfPoint2f approx = new MatOfPoint2f();
            Imgproc.approxPolyDP(c2f, approx, 0.02 * peri, true); // 다각형 근사

            Point[] ordered;
            if (approx.total() == 4) {
                ordered = orderTLTRBRBL(approx).toArray();
            } else {
                RotatedRect rr = Imgproc.minAreaRect(c2f); // 4점이 아니면 회전사각형으로 보정
                Point[] box = new Point[4];
                rr.points(box);
                ordered = orderTLTRBRBL(new MatOfPoint2f(box)).toArray();
            }

            //정수 스냅(픽셀 좌표)
            for (int i = 0; i < 4; i++) {
                ordered[i] = new Point(Math.round(ordered[i].x), Math.round(ordered[i].y));
            }

            results.add(toResult(++idx, ordered)); // DTO로 매핑(프로젝트 구조에 맞게 toResult 수정)
        }

        return results;
    }

    //TopLeft, TR, BR, BL 순서로 정렬
    private static MatOfPoint2f orderTLTRBRBL(MatOfPoint2f pts) {
        Point[] p = pts.toArray();
        Point tl = null, tr = null, br = null, bl = null;
        double minSum = 1e9, maxSum = -1e9, minDiff = 1e9, maxDiff = -1e9;

        for (Point pt : p) {
            double s = pt.x + pt.y; //최소=TL, 최대=BR
            double d = pt.y - pt.x; //최소=TR, 최대=BL
            if (s < minSum) { minSum = s; tl = pt; }
            if (s > maxSum) { maxSum = s; br = pt; }
            if (d < minDiff) { minDiff = d; tr = pt; }
            if (d > maxDiff) { maxDiff = d; bl = pt; }
        }
        return new MatOfPoint2f(tl, tr, br, bl);
    }

    private static TimeBoxResult toResult(int id, Point[] p) {
        return null;
    }
}
