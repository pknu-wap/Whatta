package whatta.Whatta.global.validator;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import whatta.Whatta.global.anotation.ValidRepeat;
import whatta.Whatta.global.entity.Repeat;

import java.util.regex.Pattern;

public class RepeatValidator implements ConstraintValidator<ValidRepeat, Repeat> {

    private static final Pattern WEEK_DAY = Pattern.compile("^(MON|TUE|WED|THU|FRI|SAT|SUN)$");
    private static final Pattern MONTH_DAY = Pattern.compile("^D([1-9]|1[0-2])$"); //D1 ~ D12
    private static final Pattern MONTH_NTH = Pattern.compile("^([1-4])(MON|TUE|WED|THU|FRI|SAT|SUN)$"); //4WED 4번째 주 수요일
    private static final Pattern MONTH_LAST = Pattern.compile("^LAST(MON|TUE|WED|THU|FRI|SAT|SUN)$"); //LASTWED 마지막 주 수요일

    @Override
    public boolean isValid(Repeat repeat, ConstraintValidatorContext constraintValidatorContext) {
        if(repeat == null) { return true; }

        switch (repeat.getUnit()) {
            case DAY:
                if(repeat.getOn() != null && !repeat.getOn().isEmpty())
                    return false;
                return true;
            case WEEK:
                if(repeat.getOn() == null || repeat.getOn().isEmpty())
                    return false;
                for(String token : repeat.getOn()) {
                    if(token == null || !WEEK_DAY.matcher(token).matches()) {
                        return false;
                    }
                }
                return true;
            case MONTH:
                if(repeat.getOn() == null || repeat.getOn().size() != 1)
                    return false;
                String token = repeat.getOn().get(0);
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
