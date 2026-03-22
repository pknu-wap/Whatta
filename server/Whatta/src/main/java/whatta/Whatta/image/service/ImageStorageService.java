package whatta.Whatta.image.service;

import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.HttpMethod;
import com.google.cloud.storage.Storage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.image.enums.StorageUploadTarget;
import whatta.Whatta.image.payload.request.SignedUrlCreateRequest;
import whatta.Whatta.image.payload.response.SignedUrlCreateResponse;
import whatta.Whatta.image.payload.response.StorageObjectUploadResponse;

import java.io.IOException;
import java.net.URL;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

@Service
@Slf4j
@RequiredArgsConstructor
public class ImageStorageService {

    private static final String ROOT_PREFIX = "uploads";
    private static final Pattern CONTENT_TYPE_SUBTYPE_PATTERN = Pattern.compile("^[a-z0-9.+-]+$");

    private final Storage gcsStorage;

    @Value("${gcs.bucket.name}")
    private String bucketName;

    @Value("${gcs.signed-url.put.expire-minutes:10}")
    private long putExpireMinutes;

    @Value("${gcs.signed-url.get.expire-minutes:10}")
    private long getExpireMinutes;

    public SignedUrlCreateResponse generateUploadSignedUrl(String userId, SignedUrlCreateRequest request) {
        validateBucketName();

        String contentType = normalizeContentType(request.normalizedContentType());
        String objectKey = buildObjectKey(userId, request.target(), resolveExtension(contentType));
        BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucketName, objectKey))
                .setContentType(contentType)
                .build();

        URL signedUrl = signPutUrl(blobInfo, contentType);

        return SignedUrlCreateResponse.builder()
                .objectKey(objectKey)
                .signedUrl(signedUrl.toString())
                .httpMethod(HttpMethod.PUT.name())
                .expiresInSeconds(TimeUnit.MINUTES.toSeconds(putExpireMinutes))
                .requiredHeaders(Map.of("Content-Type", contentType))
                .build();
    }

    public StorageObjectUploadResponse uploadImageForTest(String userId, StorageUploadTarget target, MultipartFile file) {
        validateBucketName();

        if (file == null || file.isEmpty()) {
            throw new RestApiException(ErrorCode.INVALID_STORAGE_FILE);
        }

        try {
            String contentType = normalizeContentType(file.getContentType());
            String objectKey = buildObjectKey(userId, target, resolveExtension(contentType));
            BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucketName, objectKey))
                    .setContentType(contentType)
                    .build();

            //해당 파일을 GCS에 업로드
            gcsStorage.create(blobInfo, file.getBytes());

            return StorageObjectUploadResponse.builder()
                    .objectKey(objectKey)
                    .contentType(contentType)
                    .size(file.getSize())
                    .downloadSignedUrl(createDownloadSignedUrl(userId, objectKey))
                    .build();

        } catch (IOException e) {
            log.error("[GCS][UPLOAD][ERROR] bucket={} userId={} message={}", bucketName, userId, e.getMessage(), e);
            throw new RestApiException(ErrorCode.INVALID_STORAGE_FILE);
        } catch (RestApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("[GCS][UPLOAD][ERROR] bucket={} userId={} message={}", bucketName, userId, e.getMessage(), e);
            throw new RestApiException(ErrorCode.GCS_SIGNED_URL_FAILED);
        }
    }

    public String createDownloadSignedUrl(String userId, String objectKey) {
        validateBucketName();
        validateOwnedObjectKey(userId, objectKey);
        if (gcsStorage.get(BlobId.of(bucketName, objectKey)) == null) {
            throw new RestApiException(ErrorCode.INVALID_STORAGE_OBJECT_KEY);
        }

        BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucketName, objectKey)).build();
        return signGetUrl(blobInfo).toString();
    }

    public void deleteObjectQuietly(String userId, String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return;
        }

        if (!isOwnedObjectKey(userId, objectKey)) {
            log.warn("[GCS][DELETE][SKIP] invalid object ownership. userId={} objectKey={}", userId, objectKey);
            return;
        }

        try {
            boolean deleted = gcsStorage.delete(BlobId.of(bucketName, objectKey));
            if (!deleted) {
                log.warn("[GCS][DELETE][MISS] bucket={} objectKey={}", bucketName, objectKey);
            }
        } catch (Exception e) {
            log.warn("[GCS][DELETE][ERROR] bucket={} objectKey={} message={}", bucketName, objectKey, e.getMessage(), e);
        }
    }

    private URL signPutUrl(BlobInfo blobInfo, String contentType) {
        try {
            return gcsStorage.signUrl(
                    blobInfo,
                    putExpireMinutes,
                    TimeUnit.MINUTES,
                    Storage.SignUrlOption.httpMethod(HttpMethod.PUT),
                    Storage.SignUrlOption.withV4Signature(),
                    Storage.SignUrlOption.withExtHeaders(Map.of("Content-Type", contentType))
            );
        } catch (Exception e) {
            log.error("[GCS][SIGNED_URL][PUT][ERROR] bucket={} objectKey={} message={}",
                    bucketName,
                    blobInfo.getBlobId().getName(),
                    e.getMessage(),
                    e);
            throw new RestApiException(ErrorCode.GCS_SIGNED_URL_FAILED);
        }
    }

    private URL signGetUrl(BlobInfo blobInfo) {
        try {
            return gcsStorage.signUrl(
                    blobInfo,
                    getExpireMinutes,
                    TimeUnit.MINUTES,
                    Storage.SignUrlOption.httpMethod(HttpMethod.GET),
                    Storage.SignUrlOption.withV4Signature()
            );
        } catch (Exception e) {
            log.error("[GCS][SIGNED_URL][GET][ERROR] bucket={} objectKey={} message={}",
                    bucketName,
                    blobInfo.getBlobId().getName(),
                    e.getMessage(),
                    e);
            throw new RestApiException(ErrorCode.GCS_SIGNED_URL_FAILED);
        }
    }

    private String buildObjectKey(String userId, StorageUploadTarget target, String extension) {
        String datePath = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        return "%s/%s/%s/%s/%s.%s".formatted(
                ROOT_PREFIX,
                target.getPathSegment(),
                userId,
                datePath,
                UUID.randomUUID(),
                extension
        );
    }

    private String normalizeContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            throw new RestApiException(ErrorCode.UNSUPPORTED_STORAGE_CONTENT_TYPE);
        }

        String normalized = contentType.trim().toLowerCase();
        if ("image/jpg".equals(normalized)) {
            return "image/jpeg";
        }

        if (!normalized.startsWith("image/")) {
            throw new RestApiException(ErrorCode.UNSUPPORTED_STORAGE_CONTENT_TYPE);
        }

        String subtype = normalized.substring("image/".length());
        if (!CONTENT_TYPE_SUBTYPE_PATTERN.matcher(subtype).matches()) {
            throw new RestApiException(ErrorCode.UNSUPPORTED_STORAGE_CONTENT_TYPE);
        }

        return normalized;
    }

    private String resolveExtension(String contentType) {
        String subtype = contentType.substring("image/".length());
        return switch (subtype) {
            case "jpeg", "jpg" -> "jpg";
            default -> subtype.replace('+', '-');
        };
    }

    private void validateOwnedObjectKey(String userId, String objectKey) {
        if (!isOwnedObjectKey(userId, objectKey)) {
            throw new RestApiException(ErrorCode.INVALID_STORAGE_OBJECT_KEY);
        }
    }

    private boolean isOwnedObjectKey(String userId, String objectKey) {
        if (userId == null || userId.isBlank() || objectKey == null || objectKey.isBlank()) {
            return false;
        }

        String[] segments = objectKey.trim().split("/");
        return segments.length >= 5
                && ROOT_PREFIX.equals(segments[0])
                && userId.equals(segments[2]);
    }

    private void validateBucketName() {
        if (bucketName == null || bucketName.isBlank()) {
            throw new IllegalStateException("gcs.bucket.name is empty");
        }
    }
}
