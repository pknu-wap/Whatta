package whatta.Whatta.ocr.util;

import java.util.Map;
import java.util.NavigableMap;

public class TimeConverter {
    private final int baseHour; //기준 시각 (0~23)
    private final int yAtBase; //기준 시각의 y
    private final double pxPerHour; //시간당 픽셀
    private final int roundStepMin; //반올림 단위

    private TimeConverter(int baseHour, int yAtBase, double pxPerHour, int roundStepMin) {
        this.baseHour = baseHour;
        this.yAtBase = yAtBase;
        this.pxPerHour = pxPerHour;
        this.roundStepMin = Math.max(1, roundStepMin);
    }

    /** 앵커(h→y)로부터 변환기 생성. h는 반드시 0~23 범위여야 함. */
    public static TimeConverter fromAnchors(NavigableMap<Integer,Integer> hourToY, int roundStepMin) {
        if (hourToY == null || hourToY.size() < 2) {
            //안전 기본값: 09시 기준, 100px/h 가정
            int anyY = (hourToY!=null && !hourToY.isEmpty()) ? hourToY.firstEntry().getValue() : 0;
            return new TimeConverter(9, anyY, 100.0, roundStepMin);
        }
        Map.Entry<Integer,Integer> first = hourToY.firstEntry();
        Map.Entry<Integer,Integer> last  = hourToY.lastEntry();
        int h0 = clamp24(first.getKey());
        int y0 = first.getValue();
        int h1 = clamp24(last.getKey());
        int y1 = last.getValue();
        double pxPerHour = (y1 - y0) / (double) Math.max(1, (h1 - h0)); //동일 y일 때 0분모 방지
        return new TimeConverter(h0, y0, pxPerHour, roundStepMin);
    }

    private static int clamp24(int h){ return Math.max(0, Math.min(23, h)); }

    /** 이미지 y → 총 분(00:00 기준) */
    public int minutesAtY(int y) {
        double hoursFromBase = (y - yAtBase) / pxPerHour;
        double totalH = baseHour + hoursFromBase;   //24h 직선 매핑
        int wholeH = (int)Math.floor(totalH);
        double fracH = totalH - wholeH;

        //분(0~59) 계산 후 roundStepMin 단위 반올림
        double rawMin = fracH * 60.0;
        int rounded = (int)Math.round(rawMin / roundStepMin) * roundStepMin;
        if (rounded >= 60) { wholeH += 1; rounded -= 60; }

        int h24 = ((wholeH % 24) + 24) % 24; //0~23로 정규화
        return h24 * 60 + rounded;
    }

    public String formatHHmm(int minutes) {
        int h = ((minutes / 60) % 24 + 24) % 24;
        int m = Math.abs(minutes % 60);
        return String.format("%02d:%02d", h, m);
    }
}
