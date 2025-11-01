import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder } from 'react-native';
import AnimatedRe, { interpolateColor, useAnimatedProps } from 'react-native-reanimated';
import { useDrawer } from '@/providers/DrawerProvider';
import CalendarModal from '@/components/CalendarModal';
import Menu from '@/assets/icons/menu.svg';
import Filter from '@/assets/icons/filter.svg';
import Left from '@/assets/icons/left.svg';
import Right from '@/assets/icons/right.svg';
import colors from '@/styles/colors';
import { useNavigation } from '@react-navigation/native';

const AnimatedMenu = AnimatedRe.createAnimatedComponent(Menu);

/* --- 타입 추가(오류 해결 핵심) --- */
type CustomSwitchProps = {
  value: boolean;
  onToggle: () => void;
};

/* 날짜 util */
const fmt = (iso: string) => {
  const [y,m,d] = iso.split('-').map(Number);
  const w = ['일','월','화','수','목','금','토'][new Date(y, m-1, d).getDay()];
  return `${y}년 ${String(m).padStart(2,'0')}월 ${String(d).padStart(2,'0')}일 (${w})`;
};

const addDays = (iso: string, delta: number) => {
  const [y,m,d] = iso.split('-').map(Number);
  const nd = new Date(y, m-1, d+delta);
  return `${nd.getFullYear()}-${String(nd.getMonth()+1).padStart(2,'0')}-${String(nd.getDate()).padStart(2,'0')}`;
};

const today = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
};

/* 스위치 UI */
const CustomSwitch = ({ value, onToggle }: CustomSwitchProps) => (
  <TouchableOpacity onPress={onToggle} activeOpacity={0.8}
    style={[styles.switchTrack, {backgroundColor: value ? '#B04FFF' : '#ccc'}]}>
    <View style={[
      styles.switchThumb,
      value ? {alignSelf:'flex-end'} : {alignSelf:'flex-start'}
    ]}/>
  </TouchableOpacity>
);

export default function Header() {
  const { progress, toggle } = useDrawer();
  const navigation = useNavigation<any>();

  const [selectedDate, setSelectedDate] = useState(today());
  const [calVisible, setCalVisible] = useState(false);
  const [popup, setPopup] = useState(false);

  // ✅ 라벨 목록 (시간표 제거)
  const [labels, setLabels] = useState([
    { id:'1', name:'과제', color:'#B04FFF', enabled:true },
    { id:'3', name:'약속', color:'#B04FFF', enabled:true },
    { id:'4', name:'동아리', color:'#B04FFF', enabled:true },
    { id:'5', name:'수업', color:'#B04FFF', enabled:true },
  ]);

  // ✅ toggle logic (즉시 적용)
  const allOn = labels.every(l => l.enabled);

  const toggleAll = () => {
    const newLabels = labels.map(l => ({...l, enabled: !allOn}));
    setLabels(newLabels);
    navigation.setParams({ labels: newLabels });
  };

  const toggleLabel = (i:number) => {
    const newArr = [...labels];
    newArr[i].enabled = !newArr[i].enabled;
    setLabels(newArr);
    navigation.setParams({ labels: newArr });
  };

  // 애니메이션 준비
  const popupOpacity = useState(new Animated.Value(1))[0];
  const sliderX = useState(new Animated.Value(0))[0];
  const maxSlide = 38;

  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      let x = Math.min(Math.max(g.dx, 0), maxSlide);
      sliderX.setValue(x);
      popupOpacity.setValue(1 - x/maxSlide);
    }
  });

  const menuIconProps = useAnimatedProps(() => ({
    color: interpolateColor(progress.value, [0,1], [colors.icon.default, colors.primary.main])
  }));

  const title = useMemo(() => fmt(selectedDate), [selectedDate]);

  return (
    <View style={styles.root}>
      
      {/* Header 영역 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggle}>
          <AnimatedMenu width={28} height={28} animatedProps={menuIconProps}/>
        </TouchableOpacity>

        <View style={styles.dateGroup}>
          <TouchableOpacity onPress={()=>setSelectedDate(d=>addDays(d,-1))}>
            <Left width={24} height={24} color={colors.icon.default}/>
          </TouchableOpacity>

          <TouchableOpacity onPress={()=>setCalVisible(true)} style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={()=>setSelectedDate(d=>addDays(d,1))}>
            <Right width={24} height={24} color={colors.icon.default} style={{marginTop:2}}/>
          </TouchableOpacity>
        </View>

        {/* 필터 버튼 */}
        <TouchableOpacity onPress={()=>{
          sliderX.setValue(0);
          popupOpacity.setValue(1);
          setPopup(p=>!p);
        }}>
          <Filter width={22} height={22}
            color={popup?colors.primary.main:colors.icon.default}
            style={{marginRight:15, marginTop:2}}
          />
        </TouchableOpacity>
      </View>

      {/* 필터 팝업 */}
      {popup && (
        <Animated.View style={[styles.popupContainer,{opacity:popupOpacity}]}>
          <Animated.View style={[styles.popupBox,{opacity:popupOpacity}]}>
            <Text style={styles.popupTitle}>필터</Text>

            <View style={styles.sliderTrack}>
              <Animated.View {...pan.panHandlers}
                style={[styles.sliderThumb,{transform:[{translateX:sliderX}]}]}
              />
            </View>

            <View style={{height:16}}/>

            <View style={styles.row}>
              <Text style={styles.allText}>전체</Text>
              <CustomSwitch value={allOn} onToggle={toggleAll}/>
            </View>

            <View style={{height:7}}/>
            <View style={styles.divider}/>
            <View style={{height:15}}/>

            {labels.map((l,i)=>(
              <View key={l.id} style={styles.row}>
                <View style={styles.labelRow}>
                  <View style={[styles.colorDot,{backgroundColor:l.color}]}/>
                  <Text style={styles.labelText}>{l.name}</Text>
                </View>
                <CustomSwitch value={l.enabled} onToggle={()=>toggleLabel(i)}/>
              </View>
            ))}
          </Animated.View>
        </Animated.View>
      )}

      {/* 달력 모달 */}
      <CalendarModal
        visible={calVisible}
        onClose={()=>setCalVisible(false)}
        currentDate={selectedDate}
        onSelectDate={setSelectedDate}
      />
    </View>
  );
}

/* 스타일 */
const styles = StyleSheet.create({
  root:{ borderBottomWidth:.3, borderBottomColor:'#B3B3B3', height:48 },

  header:{
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
    paddingTop:5,
    marginLeft:14
  },

  dateGroup:{ flexDirection:'row', alignItems:'center', justifyContent:'center' },
  titleContainer:{ alignItems:'center', justifyContent:'center', marginHorizontal:10 },
  title:{ textAlign:'center', fontSize:16, fontWeight:'600', lineHeight:23, letterSpacing:-0.4 },

  popupContainer:{ position:'absolute', right:10, top:48, zIndex:999 },

  popupBox:{
    width:158, backgroundColor:'#fff', borderRadius:12, paddingTop:16, paddingBottom:10,
    shadowColor:'#000', shadowOpacity:0.5, shadowRadius:24, shadowOffset:{width:0,height:12}, elevation:24
  },
  popupTitle:{ fontSize:14, fontWeight:'bold', marginLeft:16 },

  sliderTrack:{ width:38, height:2, backgroundColor:'rgba(0.2,0.2,0.2,1)', borderRadius:1, position:'absolute', right:17, top:22 },
  sliderThumb:{ width:12, height:12, borderRadius:6, backgroundColor:'#B4B4B4', position:'absolute', top:-5 },

  row:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:9 },
  allText:{ fontSize:12, marginLeft:16 },
  labelRow:{ flexDirection:'row', alignItems:'center', marginLeft:16 },
  colorDot:{ width:5, height:12, marginRight:4 },
  labelText:{ fontSize:12 },
  divider:{ width:126, height:1, backgroundColor:'#e1e1e1', alignSelf:'center' },

  switchTrack:{ width:51, height:31, borderRadius:16, padding:3, justifyContent:'center', marginRight:16 },
  switchThumb:{ width:25, height:25, borderRadius:12.5, backgroundColor:'#fff' }
});
