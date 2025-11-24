package whatta.Whatta.global.anotation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import whatta.Whatta.global.util.RepeatValidator;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Constraint(validatedBy = RepeatValidator.class)
@Target({ElementType.FIELD, ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidRepeat {
    String message() default "Invalid repeat combination";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
