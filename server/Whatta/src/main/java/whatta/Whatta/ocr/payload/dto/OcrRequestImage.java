package whatta.Whatta.ocr.payload.dto;

public record OcrRequestImage(
        String format, //jpg | jpeg | png (pdf와 tiff도 가능하나 미지원)
        String name,

        /*
        images.url 또는 images.data 중 하나 필수 입력
            둘 다 입력 시 images.data 우선
        */
        String url, //이미지를 불러올 수 있는 공개된 URL
        String data //Base64 인코딩된 이미지 데이터
) {
}
