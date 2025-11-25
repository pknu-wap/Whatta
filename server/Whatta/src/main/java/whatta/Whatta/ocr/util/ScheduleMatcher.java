package whatta.Whatta.ocr.util;

import org.bytedeco.opencv.opencv_core.Point;
import whatta.Whatta.ocr.payload.dto.BoundingPoly;
import whatta.Whatta.ocr.payload.dto.DetectedBlock;
import whatta.Whatta.ocr.payload.dto.MatchedScheduleBlock;
import whatta.Whatta.ocr.payload.dto.OcrText;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public class ScheduleMatcher {

    public static List<MatchedScheduleBlock> matchAll(DetectedBlock blocks, List<OcrText> ocrTexts) {
        //x, y축 앵커 수집
        Map<String, Integer> weekDayX = extractWeekdayAnchors(ocrTexts);
        NavigableMap<Integer, Integer> hourY = extractHourAnchors(ocrTexts);

        final int headerBandMaxY = computeHeaderBandMaxY(ocrTexts, 80);

        //블록 내부 text 묶기 + 요일/시간 채우기
        List<MatchedScheduleBlock> matches = new ArrayList<>();
        for (DetectedBlock.Block b : blocks.blocks()) {
            Rect r = Rect.fromBlock(b);

            List<OcrText> inside = ocrTexts.stream()
                    .filter(f -> r.contains(f.centerX(), f.centerY()))
                    .toList();

            //블록 중심 x가 가장 가까운 요일 매핑
            String weekDay = inferWeekDay(r.centerX(), weekDayX);
            //시작/종료시간 매핑
            TimeConverter tConv = TimeConverter.fromAnchors(hourY, 10); //10분 단위로 반올림
            String start = tConv.formatHHmm(tConv.minutesAtY(r.top()));
            String end = tConv.formatHHmm(tConv.minutesAtY(r.bottom()));

            //텍스트만 추출
            List<String> texts = inside.stream()
                    .filter(t -> notAxisLabel(t, headerBandMaxY))
                    .map(OcrText::text)
                    .collect(Collectors.toList());

            matches.add(MatchedScheduleBlock.builder()
                            .blockId(b.id())
                            .weekDay(weekDay)
                            .startTime(start)
                            .endTime(end)
                            .texts(texts)
                    .build());
        }
        return matches;
    }

   /* private static boolean notAxisLabel(String s) {
        if (s == null) return false;
        String t = s.trim();
        if (t.isEmpty()) return false;
        if (WEEKDAY.matcher(t).matches()) return false; //요일 라벨 제거
        if (HOUR.matcher(t).matches()) return false; //시간 숫자 제거
        return true;
    }*/

    private static boolean notAxisLabel(OcrText t, int headerBandMaxY) {
        if (t == null || t.text() == null) return false;
        String raw = t.text().trim();
        if (raw.isEmpty()) return false;

        //헤더 밴드에 있는 것만 축 라벨로 보고 제거
        if (WEEKDAY.matcher(raw).matches() && t.topY() <= headerBandMaxY) {
            return false;
        }

        //시간 숫자(1~12)
        if (HOUR.matcher(raw).matches()) {
            return false;
        }

        return true;
    }

    private static int computeHeaderBandMaxY(List<OcrText> texts, int margin) {
        int minY = Integer.MAX_VALUE;
        for (OcrText t : texts) {
            String s = t.text();
            if (s == null) continue;
            String raw = s.trim();
            if (WEEKDAY.matcher(raw).matches()) {
                minY = Math.min(minY, t.topY());
            }
        }
        if (minY == Integer.MAX_VALUE) return Integer.MIN_VALUE; //요일 없는 경ㅇ
        return minY + Math.max(margin, 0);
    }

    private static final Pattern WEEKDAY = Pattern.compile("^(월|화|수|목|금|토|일)(?:요일)?$"); //월, 월요일, 월.*
    private static final Pattern HOUR = Pattern.compile("^([1-9]|1[0-2])$");

    private static String koToEn(String ko1) {
        return switch (ko1) {
            case "월" -> "MON";
            case "화" -> "TUE";
            case "수" -> "WED";
            case "목" -> "THU";
            case "금" -> "FRI";
            case "토" -> "SAT";
            case "일" -> "SUN";
            default -> null;
        };
    }

    private static Map<String, Integer> extractWeekdayAnchors(List<OcrText> texts) {
        record Cand(String day, int x, int y) {}

        Map<String, Cand> candidate = new HashMap<>();
        for (OcrText text : texts) {
            String raw = text.text().trim();
            if (!WEEKDAY.matcher(raw).matches()) continue;
            String weekDay = raw.substring(0, 1);

            int y = text.topY();
            int x = text.centerX();

            Cand c = candidate.get(weekDay);
            if ( c == null || y < c.y) { //더  위에 있는 y를 가진 text
                candidate.put(weekDay, new Cand(weekDay, x, y));
            }
        }

        Map<String, Integer> anchors = new HashMap<>();
        for (var e : candidate.entrySet()) {
            anchors.put(e.getKey(), e.getValue().x());
        }
        System.out.println("[weekdayAnchors] " + anchors);  // ex) {월=123, 화=240, 수=360, ...}
        return anchors;
    }

    private static NavigableMap<Integer, Integer> extractHourAnchors(List<OcrText> texts) {

        List<int[]> candidates = new ArrayList<>();
        for (OcrText text : texts) {
            String t = text.text().trim();
            if (HOUR.matcher(t).matches()) {
                int hour = Integer.parseInt(t);
                candidates.add(new int[]{hour, text.topY()});
            }
        }
        candidates.sort(Comparator.comparingInt(o->o[1]));

        //y 순서대로 24시간으로 보정
        int offset = 0;
        int prev = Integer.MIN_VALUE;
        Map<Integer, List<Integer>> bucket = new HashMap<>();
        for (int[] c : candidates) {
            int h = c[0];
            int y = c[1];

            int unwrapped = h + offset;
            if (unwrapped <= prev) { //이전보다 작거나 같으면 12시간 추가
                int diff = prev - unwrapped + 1;
                int k = (diff + 11) / 12; //12의 배수로 올림
                offset += 12 * k;
                unwrapped = h + offset;
            }
            bucket.computeIfAbsent(unwrapped, k2 -> new ArrayList<>()).add(y);
            prev = unwrapped;
        }
        TreeMap<Integer, Integer> anchors = new TreeMap<>();
        for (var e : bucket.entrySet()) {
            List<Integer> ys = e.getValue();
            int avg = (int) Math.round(ys.stream().mapToInt(i -> i).average().orElseThrow());
            anchors.put(e.getKey(), avg);
        }
        return anchors;
    }

    private static class Rect {
        int left, top, right, bottom;

        Rect(int left, int top, int right, int bottom) {
            this.left = left;
            this.top = top;
            this.right = right;
            this.bottom = bottom;
        }
        boolean contains(int x, int y) {
            return x>=left && x<=right && y>=top && y<=bottom;
        }
        int centerX() { return  (left+right)/2; }
        int top() { return top; }
        int bottom() { return bottom; }

        static Rect fromBlock(DetectedBlock.Block block) {
            Point tl = toPoint(block.tl()), tr = toPoint(block.tr()), br = toPoint(block.br()), bl = toPoint(block.bl());
            int l = Math.min(tl.x(), bl.x());
            int r = Math.max(tr.x(), br.x());
            int t = Math.min(tl.y(), tr.y());
            int bo= Math.max(bl.y(), br.y());
            return new Rect(l,t,r,bo);
        }
        static Point toPoint(BoundingPoly.Vertex v){ return new Point(v.x(), v.y()); }
    }

    private static String inferWeekDay(int x, Map<String, Integer> anchors) {
        if (anchors == null || anchors.isEmpty()) return null;

        String best = null; int bestD = Integer.MAX_VALUE;
        for (var e: anchors.entrySet()) {
            int d = Math.abs(x - e.getValue());
            if (d < bestD) {
                bestD = d;
                best = e.getKey();
            }
        }
        return koToEn(best);
    }

}
