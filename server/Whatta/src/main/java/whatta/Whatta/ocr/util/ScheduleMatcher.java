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
        int[] gridRange = computeGridYRange(blocks);
        int gridTopY = gridRange[0];
        int gridBottomY = gridRange[1];

        //x, y축 앵커 수집
        Map<String, Integer> weekDayX = extractWeekdayAnchors(ocrTexts);
        NavigableMap<Integer, Integer> hourY = extractHourAnchors(ocrTexts, gridTopY, gridBottomY, weekDayX);
        //System.out.println("[hourAnchors] " + hourY);

        final int headerBandMaxY = computeHeaderBandMaxY(ocrTexts, 80);
        final int verticalTolerance = computeVerticalTolerance(hourY);

        //블록 내부 text 묶기 + 요일/시간 채우기
        List<MatchedScheduleBlock> matches = new ArrayList<>();
        for (DetectedBlock.Block b : blocks.blocks()) {
            Rect r = Rect.fromBlock(b);

            if (isOutsideScheduleBand(r, gridTopY, gridBottomY, headerBandMaxY, verticalTolerance)) {
                continue;
            }

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

        //헤더 밴드 위에 있는 텍스트는 모두 무시
        if (headerBandMaxY != Integer.MIN_VALUE && t.bottomY() <= headerBandMaxY) {
            return false;
        }

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

    private static final Pattern WEEKDAY = Pattern.compile(
            "^(월|화|수|목|금|토|일)(?:요일)?$|^(MON|TUE|WED|THU|FRI|SAT|SUN)(?:DAY)?$",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern HOUR = Pattern.compile("^([1-9]|1[0-2])$");

    private static String koToEn(String ko1) {
        return switch (ko1) {
            case "월", "MON", "MONDAY" -> "MON";
            case "화", "TUE", "TUESDAY" -> "TUE";
            case "수", "WED", "WEDNESDAY" -> "WED";
            case "목", "THU", "THURSDAY" -> "THU";
            case "금", "FRI", "FRIDAY" -> "FRI";
            case "토", "SAT", "SATURDAY" -> "SAT";
            case "일", "SUN", "SUNDAY" -> "SUN";
            default -> null;
        };
    }

    private static String normalizeWeekday(String raw) {
        if (raw == null) {
            return null;
        }
        return koToEn(raw.trim().toUpperCase(Locale.ROOT));
    }

    private static Map<String, Integer> extractWeekdayAnchors(List<OcrText> ocrTexts) {
        record Candidate(String day, int x, int y) {}

        Map<String, Candidate> candidate = new HashMap<>();
        for (OcrText text : ocrTexts) {
            String raw = text.text().trim();
            if (!WEEKDAY.matcher(raw).matches()) continue;
            String weekDay = normalizeWeekday(raw);
            if (weekDay == null) continue;

            int y = text.topY();
            int x = text.centerX();

            Candidate c = candidate.get(weekDay);
            if ( c == null || y < c.y) { //더  위에 있는 y를 가진 text
                candidate.put(weekDay, new Candidate(weekDay, x, y));
            }
        }

        Map<String, Integer> anchors = new HashMap<>();
        for (var e : candidate.entrySet()) {
            anchors.put(e.getKey(), e.getValue().x());
        }
        //System.out.println("[weekdayAnchors] " + anchors);  // ex) {월=123, 화=240, 수=360, ...}
        return anchors;
    }

    private record HourAnchorCandidate (int hour, int y) {}

    private static NavigableMap<Integer, Integer> extractHourAnchors(List<OcrText> ocrTexts, int gridTopY, int gridBottomY, Map<String, Integer> weekDayX) {
        int firstWeekdayX = firstWeekdayAnchorX(weekDayX);

        List<HourAnchorCandidate> candidates = collectHourAnchorCandidate(ocrTexts, gridTopY, gridBottomY, firstWeekdayX);

        removeVerticalOutliers(candidates); //y축 앵커 후보 중 격자 밖 제거

        Map<Integer, List<Integer>> hourToAnchorYs = resolveHourSequence(candidates);

        return averageAnchorY(hourToAnchorYs);
    }

    private static int firstWeekdayAnchorX(Map<String, Integer> weekDayX) {
        if (weekDayX == null || weekDayX.isEmpty()) {
            return Integer.MAX_VALUE;
        }
        return weekDayX.values().stream()
                .mapToInt(Integer::intValue)
                .min()
                .orElse(Integer.MAX_VALUE);
    }

    private static List<HourAnchorCandidate> collectHourAnchorCandidate(List<OcrText> ocrTexts, int gridTopY, int gridBottomY, int firstWeekdayX) {
        List<HourAnchorCandidate> candidates = new ArrayList<>();

        for (OcrText text : ocrTexts) {
            String raw = text.text().trim();
            int topY = text.topY();
            int centerX = text.centerX();

            if (topY < gridTopY || topY > gridBottomY) {
                continue;
            }
            if (firstWeekdayX != Integer.MAX_VALUE && centerX >= firstWeekdayX) {
                continue;
            }
            if (!HOUR.matcher(raw).matches()) {
                continue;
            }

            candidates.add(new HourAnchorCandidate(Integer.parseInt(raw), topY));
        }

        candidates.sort(Comparator.comparingInt(HourAnchorCandidate::y));
        return candidates;
    }

    private static void removeVerticalOutliers(List<HourAnchorCandidate> candidates) {
        if (candidates.size() < 3) {
            return;
        }

        List<Integer> diffs = new ArrayList<>();
        for (int i = 0; i < candidates.size() - 1; i++) {
            int diff = candidates.get(i + 1).y() - candidates.get(i).y();
            if (diff > 0) {
                diffs.add(diff);
            }
        }

        if (diffs.isEmpty()) {
            return;
        }

        Collections.sort(diffs);
        int medianGap = diffs.get(diffs.size() / 2);
        double maxAllowedGap = medianGap * 1.4; //격자 간격보다 너무 큰 간격은 그리드 밖으로 간주

        //상단 쪽 아웃라이어 제거
        while (candidates.size() >= 3) {
            int topGap = candidates.get(1).y() - candidates.get(0).y();
            if (topGap <= maxAllowedGap) {
                break;
            }
            candidates.remove(0); //최상단 쓸모없는 앵커 제거
        }

        //하단 쪽 아웃라이어 제거
        while (candidates.size() >= 3) {
            int last = candidates.size() - 1;
            int bottomGap = candidates.get(last).y() - candidates.get(last - 1).y();
            if (bottomGap <= maxAllowedGap) {
                break;
            }
            candidates.remove(last); //최하단 쓸모없는 앵커 제거
        }
    }

    private static Map<Integer, List<Integer>> resolveHourSequence(List<HourAnchorCandidate> candidates) {
        int hourOffset = 0;
        int previousHour = Integer.MIN_VALUE;
        Map<Integer, List<Integer>> hourToAnchorYs = new HashMap<>();

        for (HourAnchorCandidate candidate : candidates) {
            int rawHour = candidate.hour();
            int anchorY = candidate.y();

            int normalizedHour = rawHour + hourOffset;
            if (normalizedHour <= previousHour) {
                int diff = previousHour - normalizedHour + 1;
                int wrapCount = (diff + 11) / 12;
                hourOffset += 12 * wrapCount;
                normalizedHour = rawHour + hourOffset;
            }

            hourToAnchorYs
                    .computeIfAbsent(normalizedHour, ignored -> new ArrayList<>())
                    .add(anchorY);

            previousHour = normalizedHour;
        }
        return hourToAnchorYs;
    }

    private static NavigableMap<Integer, Integer> averageAnchorY(Map<Integer, List<Integer>> hourToAnchorYs) {
        TreeMap<Integer, Integer> result = new TreeMap<>();

        for (var entry : hourToAnchorYs.entrySet()) {
            int averageY = (int) Math.round(
                    entry.getValue().stream().mapToInt(Integer::intValue).average().orElseThrow()
            );
            result.put(entry.getKey(), averageY);
        }

        return result;
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
        if (minY == Integer.MAX_VALUE) return Integer.MIN_VALUE; //요일 없는 경우
        return minY + Math.max(margin, 0);
    }

    private static int computeVerticalTolerance(NavigableMap<Integer, Integer> hourY) {
        if (hourY == null || hourY.size() < 2) {
            return 20;
        }
        Iterator<Integer> it = hourY.values().iterator();
        int prev = it.next();
        int minGap = Integer.MAX_VALUE;
        while (it.hasNext()) {
            int cur = it.next();
            int gap = cur - prev;
            if (gap > 0) {
                minGap = Math.min(minGap, gap);
            }
            prev = cur;
        }
        if (minGap == Integer.MAX_VALUE) {
            return 20;
        }
        return Math.max(20, minGap / 3);
    }

    private static boolean isOutsideScheduleBand(
            Rect r,
            int gridTopY,
            int gridBottomY,
            int headerBandMaxY,
            int verticalTolerance
    ) {
        if (headerBandMaxY != Integer.MIN_VALUE && r.bottom() <= headerBandMaxY) {
            return true;
        }
        if (r.bottom() < gridTopY - verticalTolerance) {
            return true;
        }
        return r.top() > gridBottomY + verticalTolerance;
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

    private static int[] computeGridYRange(DetectedBlock blocks) {
        var list = blocks.blocks();
        if (list == null || list.isEmpty()) {
            return null;
        }

        int minY = Integer.MAX_VALUE;
        int maxY = Integer.MIN_VALUE;

        for (var b : list) {
            Rect r = Rect.fromBlock(b);
            if (r.top < minY) minY = r.top;
            if (r.bottom > maxY) maxY = r.bottom;
        }

        int height = maxY - minY;
        int margin = Math.max(10, (int)(height * 0.05));

        return new int[]{minY - margin, maxY + margin};
    }
}
