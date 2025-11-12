package whatta.Whatta.ocr.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import whatta.Whatta.ocr.payload.request.ImageUploadRequest;
import whatta.Whatta.ocr.service.OcrService;
import whatta.Whatta.global.payload.Response;

@RestController
@RequestMapping("/api/ocr")
@AllArgsConstructor
@PreAuthorize("isAuthenticated()")
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "OCR", description = "OCR 등록 API")
public class OcrController {

    private final OcrService ocrService;

    @PostMapping
    @Operation(summary = "시간표 이미지 등록", description = "시간표 이미지에서 text를 추출하여 일정 정보로 반환합니다.")
    public ResponseEntity<?> uploadImage (@AuthenticationPrincipal String userId,
                                          @RequestBody @Validated ImageUploadRequest request) {
        return Response.ok("success upload image", ocrService.uploadImage(userId, request));
    }
}
