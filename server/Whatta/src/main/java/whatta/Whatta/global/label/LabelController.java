package whatta.Whatta.global.label;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import whatta.Whatta.global.payload.response.Response;

import java.util.List;

@RestController
@RequestMapping("/api/label")
@AllArgsConstructor
@Tag(name = "Label", description = "Label API")
public class LabelController {

    private final LabelService labelService;

    @PostMapping()
    @Operation(summary = "Label 생성", description = "새로운 Label을 생성합니다.")
    public ResponseEntity<?> creatLabel(@RequestBody List<String> labels) {
        labelService.createLabel("user123", labels);
        return Response.ok("success get labels");
    }

    @GetMapping()
    @Operation(summary = "Label 리스트 조회", description = "유저가 가진 Label의 리스트를 제공합니다.")
    public ResponseEntity<?> getLabels() {
        return Response.ok("success get labels", labelService.getLabels("user123"));
    }
}
