package whatta.Whatta.global.util;

import java.text.Collator;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class LabelsBuilder {
    public LabelsBuilder() {}

    //private static final int DEFAULT_LABEL_SIZE = 5;

    public static List<String> BuildLabels(List<String> requestLabels, String DefaultLabel) {
        List<String> labels = new ArrayList<>();
        labels.add(DefaultLabel);

        //중복 제거
        for (String raw : requestLabels) {
            if(raw == null) continue;

            String label = raw.trim();
            if(label.isEmpty()) continue;

            if(labels.stream().anyMatch(l -> l.equalsIgnoreCase(label))) { continue; }
            labels.add(label);
        }

        //정렬
        Collator collator = Collator.getInstance(Locale.KOREAN);
        collator.setStrength(Collator.PRIMARY);
        labels.sort(collator);

        return labels;
    }
}
