package whatta.Whatta.Image.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import whatta.Whatta.global.payload.Response;
import whatta.Whatta.Image.enums.StorageUploadTarget;
import whatta.Whatta.Image.payload.request.SignedUrlCreateRequest;
import whatta.Whatta.Image.service.ImageStorageService;

@RestController
@RequestMapping("/api/image")
@AllArgsConstructor
@PreAuthorize("isAuthenticated()")
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "Image Upload", description = "GCS Signed URL API")
public class ImageStorageController {

    private final ImageStorageService imageStorageService;

    @PostMapping("/upload")
    @Operation(summary = "이미지 업로드용 Signed URL 발급",
            description = "앱이 저장소(storage)에 직접 업로드할 수 있도록 Signed URL과 objectKey를 발급합니다."
                    + "<br>- target : AGENT_IMAGE | OCR_IMAGE"
                    + "<br>- contentType : image/jpg, image/jpeg, image/png 등"
                    + "<br>- 응답의 requiredHeaders 값을 그대로 PUT 요청 헤더에 넣어주세요.")
    public ResponseEntity<?> generateUploadSignedUrl(@AuthenticationPrincipal String userId,
                                                     @RequestBody @Validated SignedUrlCreateRequest request) {
        return Response.ok("success issue upload signed url", imageStorageService.generateUploadSignedUrl(userId, request));
    }

    @PostMapping(value = "/only-test", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "(테스트용) 서버에서 GCS 직접 업로드",
            description = "Swagger에서만 사용하는 api 입니다."
                    + "<br>파일을 바로 선택해 서버를 통해 GCS로 업로드합니다.<br>"
                    + "<br>- 앱에서는 사용하지 않고 수동 테스트용입니다."
                    + "<br>- target : AGENT_IMAGE | OCR_IMAGE"
                    + "<br>- file : jpg, jpeg, png 등 image/* 파일")
    public ResponseEntity<?> uploadImage(@AuthenticationPrincipal String userId,
                                         @RequestParam StorageUploadTarget target,
                                         @RequestPart MultipartFile file) {
        return Response.ok("success upload test file to gcs", imageStorageService.uploadImageForTest(userId, target, file)
        );
    }
}
