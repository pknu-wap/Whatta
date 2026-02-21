package whatta.Whatta.global.util;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import whatta.Whatta.global.anotation.ValidRepeat;
import whatta.Whatta.event.payload.request.RepeatRequest;

import java.util.regex.Pattern;

public class RepeatValidator implements ConstraintValidator<ValidRepeat, RepeatRequest> {

    private static final Pattern WEEK_DAY = Pattern.compile("^(MON|TUE|WED|THU|FRI|SAT|SUN)$");
    private static final Pattern MONTH_DAY = Pattern.compile("^D([1-9]|[12][0-9]|3[01])$"); //D1 ~ D31
    private static final Pattern MONTH_NTH = Pattern.compile("^([1-4])(MON|TUE|WED|THU|FRI|SAT|SUN)$"); //4WED 4번째 주 수요일
    private static final Pattern MONTH_LAST = Pattern.compile("^LAST(MON|TUE|WED|THU|FRI|SAT|SUN)$"); //LASTWED 마지막 주 수요일

    @Override
    public boolean isValid(RepeatRequest repeatRequest, ConstraintValidatorContext constraintValidatorContext) {
        if(repeatRequest == null) { return true; }

        switch (repeatRequest.unit()) {
            case DAY:
                if(repeatRequest.on() != null && !repeatRequest.on().isEmpty())
                    return false;
                return true;
            case WEEK:
                if(repeatRequest.on() == null || repeatRequest.on().isEmpty())
                    return false;
                for(String token : repeatRequest.on()) {
                    if(token == null || !WEEK_DAY.matcher(token).matches()) {
                        return false;
                    }
                }
                return true;
            case MONTH:
                if(repeatRequest.on() == null || repeatRequest.on().size() != 1)
                    return false;
                String token = repeatRequest.on().get(0);
                if (token == null) return false;
                if(!(MONTH_DAY.matcher(token).matches()
                || MONTH_NTH.matcher(token).matches()
                || MONTH_LAST.matcher(token).matches())) {
                    return false;
                }
                return true;
        }
        return false;
    }
}
