package whatta.Whatta.global.util;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import whatta.Whatta.global.anotation.ValidRepeat;
import whatta.Whatta.event.payload.request.RepeatRequest;

import static whatta.Whatta.global.util.RepeatRulePatterns.*;


public class RepeatValidator implements ConstraintValidator<ValidRepeat, RepeatRequest> {

    @Override
    public boolean isValid(RepeatRequest repeatRequest, ConstraintValidatorContext constraintValidatorContext) {
        if(repeatRequest == null) { return true; }

        switch (repeatRequest.unit()) {
            case DAY:
                return repeatRequest.on() == null || repeatRequest.on().isEmpty();
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
                return MONTH_DAY.matcher(token).matches()
                        || MONTH_NTH.matcher(token).matches()
                        || MONTH_LAST.matcher(token).matches();
        }
        return false;
    }
}
