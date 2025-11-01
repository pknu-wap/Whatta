import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { token } from "@/lib/token";
import { useNavigation } from "@react-navigation/native";

/** Toggle Props 타입 */
type ToggleProps = {
  value: boolean;
  onChange: (v: boolean) => void;
};

export default function ScheduleDetailScreen() {
  const navigation = useNavigation();
  const [visible] = useState(true);

  const close = () => navigation.goBack();

  /** 색상 */
  const COLORS = [
    "#FF0000",
    "#FF7A00",
    "#FFD500",
    "#00C700",
    "#0085FF",
    "#001AFF",
    "#7A00FF",
    "#C400FF",
    "#FFFFFF",
  ];
  const [selectedColor, setSelectedColor] = useState("#7A00FF");
  const [showPalette, setShowPalette] = useState(false);

  /** 라벨 */
  const LABELS = ["약속", "동아리", "수업", "과제"];
  const [selectedLabel, setSelectedLabel] = useState("약속");
  const [labelOpen, setLabelOpen] = useState(false);

  /** 일정 입력값 */
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [memo, setMemo] = useState("");

  /** 날짜 & 시간 */
  const [start, setStart] = useState(new Date());
  const [end, setEnd] = useState(new Date());

  const [showStartDate, setShowStartDate] = useState(false);
  const [showStartTime, setShowStartTime] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);

  /** 토글 상태 */
  const [timeOn, setTimeOn] = useState(false);
  const [repeatOn, setRepeatOn] = useState(false);
  const [remindOn, setRemindOn] = useState(false);
  const [trafficOn, setTrafficOn] = useState(false);

  /** 서버 포맷 */
  const formatDateForServer = (d: Date) => d.toISOString().split("T")[0];
  const formatTimeForServer = (d: Date) => d.toTimeString().substring(0, 8);

  /** Toggle 컴포넌트 */
  const Toggle = ({ value, onChange }: ToggleProps) => (
    <Pressable
      onPress={() => onChange(!value)}
      style={[
        styles.toggle,
        { backgroundColor: value ? "#9D7BFF" : "#ccc" },
      ]}
    >
      <View
        style={[
          styles.thumb,
          { transform: [{ translateX: value ? 22 : 0 }] },
        ]}
      />
    </Pressable>
  );

  /** 저장 */
  const handleSave = async () => {
    try {
      const payload = {
        title: scheduleTitle,
        content: memo ?? "",
        startDate: formatDateForServer(start),
        endDate: formatDateForServer(end),
        startTime: timeOn ? formatTimeForServer(start) : null,
        endTime: timeOn ? formatTimeForServer(end) : null,
        colorKey: selectedColor.replace("#", ""),
      };

      console.log("📤 전송 payload:", payload);

      const access = token.getAccess();
      await axios.post(
        "https://whatta-server-741565423469.asia-northeast3.run.app/api/event",
        payload,
        { headers: { Authorization: `Bearer ${access}` } }
      );

      console.log("✅ 일정 저장 성공");
      navigation.goBack();
    } catch (err) {
      console.log("❌ 일정 저장 실패:", err);
      alert("저장 실패");
    }
  };

  const formatDate = (d: Date) =>
    d
      .toLocaleDateString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
      })
      .replace(/\d{4}\.\s*/, "");

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  return (
    <>
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.box}>
            {/* HEADER */}
            <View style={styles.header}>
              <Pressable onPress={close}>
                <Text style={styles.cancel}>취소</Text>
              </Pressable>
              <Text style={styles.hTitle}>일정 생성</Text>
              <Pressable onPress={handleSave}>
                <Text style={styles.saveBtn}>저장</Text>
              </Pressable>
            </View>

            {/* 제목 + 색 */}
            <View style={styles.row}>
              <Pressable onPress={() => setShowPalette(!showPalette)}>
                <Text style={[styles.colorDot, { color: selectedColor }]}>●</Text>
              </Pressable>

              <TextInput
                placeholder="제목"
                style={styles.titleInput}
                value={scheduleTitle}
                onChangeText={setScheduleTitle}
              />
            </View>

            {/* 색상 선택 */}
            {showPalette && (
              <View style={styles.paletteRow}>
                {COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => {
                      setSelectedColor(c);
                      setShowPalette(false);
                    }}
                    style={[
                      styles.colorOption,
                      { backgroundColor: c },
                      selectedColor === c && styles.selected,
                    ]}
                  />
                ))}
              </View>
            )}

            <View style={styles.sep} />

            {/* 날짜 */}
            <View style={styles.dateWrap}>
              <View style={styles.dateSide}>
                <Pressable onPress={() => setShowStartDate(true)}>
                  <Text style={styles.dateText}>{formatDate(start)}</Text>
                </Pressable>
                {timeOn && (
                  <Pressable onPress={() => setShowStartTime(true)}>
                    <Text style={styles.timeText}>{formatTime(start)}</Text>
                  </Pressable>
                )}
              </View>

              <Text style={styles.arrow}>→</Text>

              <View style={styles.dateSide}>
                <Pressable onPress={() => setShowEndDate(true)}>
                  <Text style={styles.dateText}>{formatDate(end)}</Text>
                </Pressable>
                {timeOn && (
                  <Pressable onPress={() => setShowEndTime(true)}>
                    <Text style={styles.timeText}>{formatTime(end)}</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.sep} />

            {/* 시간입력 */}
            <View style={styles.row}>
              <Text style={styles.label}>시간 입력</Text>
              <Toggle value={timeOn} onChange={setTimeOn} />
            </View>

            <View style={styles.sep} />

            {/* 라벨 */}
            <Pressable onPress={() => setLabelOpen(!labelOpen)}>
              <Text style={styles.label}>라벨: {selectedLabel}</Text>
            </Pressable>

            {labelOpen && (
              <View style={styles.labelList}>
                {LABELS.map((l) => (
                  <Pressable
                    key={l}
                    onPress={() => {
                      setSelectedLabel(l);
                      setLabelOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.labelOption,
                        selectedLabel === l && styles.selectedLabel,
                      ]}
                    >
                      {l}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.sep} />

            {/* 반복/알림 */}
            <View style={styles.row}>
              <Text style={styles.label}>반복</Text>
              <Toggle value={repeatOn} onChange={setRepeatOn} />
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>리마인드 알림</Text>
              <Toggle value={remindOn} onChange={setRemindOn} />
            </View>
            {remindOn && <Text style={styles.remindText}>10분 전</Text>}

            <View style={styles.row}>
              <Text style={styles.label}>교통 알림</Text>
              <Toggle value={trafficOn} onChange={setTrafficOn} />
            </View>

            <View style={styles.sep} />

            {/* 메모 */}
            <TextInput
              placeholder="메모 입력"
              value={memo}
              onChangeText={setMemo}
              multiline
              style={styles.memo}
            />
          </View>
        </View>
      </Modal>

      {/* DateTimePickers */}
      {showStartDate && (
        <DateTimePicker
          value={start}
          mode="date"
          onChange={(_, d) => {
            setShowStartDate(false);
            d && setStart(d);
          }}
        />
      )}

      {timeOn && showStartTime && (
        <DateTimePicker
          value={start}
          mode="time"
          onChange={(_, d) => {
            setShowStartTime(false);
            d && setStart(d);
          }}
        />
      )}

      {showEndDate && (
        <DateTimePicker
          value={end}
          mode="date"
          onChange={(_, d) => {
            setShowEndDate(false);
            d && setEnd(d);
          }}
        />
      )}

      {timeOn && showEndTime && (
        <DateTimePicker
          value={end}
          mode="time"
          onChange={(_, d) => {
            setShowEndTime(false);
            d && setEnd(d);
          }}
        />
      )}
    </>
  );
}

/*** styles ***/
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  box: { width: "90%", backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cancel: { color: "#555", fontSize: 16 },
  hTitle: { fontSize: 18, fontWeight: "bold" },
  saveBtn: { color: "#7A4CFF", fontSize: 16, fontWeight: "bold" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 10 },
  colorDot: { fontSize: 22 },
  titleInput: { flex: 1, borderBottomWidth: 1, borderBottomColor: "#eee", marginLeft: 6, fontSize: 17 },
  paletteRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 8 },
  colorOption: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: "#ccc" },
  selected: { borderColor: "#000", borderWidth: 2 },
  sep: { height: 1, backgroundColor: "#eee", marginVertical: 12 },
  dateWrap: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  dateSide: { alignItems: "center", marginHorizontal: 28 },
  dateText: { fontSize: 17, fontWeight: "600", marginBottom: 4 },
  timeText: { fontSize: 19 },
  arrow: { fontSize: 20, color: "#555" },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 5 },
  remindText: { marginLeft: 10, marginBottom: 5, fontSize: 13, color: "#888" },
  memo: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, height: 90, padding: 10, fontSize: 14 },
  toggle: { width: 50, height: 26, borderRadius: 20, padding: 2 },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  labelList: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  labelOption: { paddingVertical: 6, paddingHorizontal: 14, margin: 4, borderRadius: 20, backgroundColor: "#eee" },
  selectedLabel: { backgroundColor: "#9D7BFF", color: "#fff" },
});
