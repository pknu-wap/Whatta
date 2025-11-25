# ---- Build stage ----
FROM eclipse-temurin:17-jdk AS build
WORKDIR /workspace
COPY . .
RUN ./gradlew clean bootJar --no-daemon

# ---- Run stage ----
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /workspace/build/libs/*.jar app.jar

# Cloud Run이 PORT 환경변수 내려줌. 없으면 8080
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]
