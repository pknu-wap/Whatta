import React from 'react'
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import { POLICY_UPDATE_EFFECTIVE_DATE } from '@/lib/policyUpdateConsent'

type Props = {
  visible: boolean
  blocked: boolean
  onAgree: () => void
  onDisagree: () => void
}

const PRIVACY_POLICY_URL = 'https://denim-gum-351.notion.site/privacy-policy'

const CHANGE_ITEMS = [
  'AI 대화 및 일정 생성 기능 관련 안내가 추가되었습니다.',
  '시간표 이미지 업로드 및 AI 사진 첨부 기능에 대한 처리 기준이 추가되었습니다.',
  '현재 위치 기반 날씨 기능 제공을 위한 위치정보(GPS) 이용 안내가 추가되었습니다.',
  '사진, 위치의 이용 목적 및 철회 방법이 명시되었습니다.',
  '제3자 서비스 목록에 OpenAI 및 WeatherAPI 관련 내용이 반영되었습니다.',
] as const

export default function PolicyUpdateModal({
  visible,
  blocked,
  onAgree,
  onDisagree,
}: Props) {
  const { height } = useWindowDimensions()
  const compact = height <= 780

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={S.backdrop}>
        <View style={[S.card, compact ? S.cardCompact : null]}>
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={compact ? S.scrollContentCompact : S.scrollContent}
          >
          <LinearGradient
            colors={['#EEF1FF', '#F6EEFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[S.hero, compact ? S.heroCompact : null]}
          >
            <View style={S.heroBadge}>
              <Text style={S.heroBadgeText}>NOTICE</Text>
            </View>
            <Text style={[S.title, compact ? S.titleCompact : null]}>
              개인정보처리방침 및 이용약관 변경 안내
            </Text>
            <Text style={[S.description, compact ? S.descriptionCompact : null]}>
              Whatta(와타) 서비스 업데이트에 따라 개인정보처리방침 및 이용약관이
              변경되었습니다.
            </Text>
          </LinearGradient>

          <View style={[S.section, compact ? S.sectionCompact : null]}>
            <Text style={S.sectionTitle}>주요 변경 사항</Text>
            {CHANGE_ITEMS.map((item) => (
              <View key={item} style={[S.listRow, compact ? S.listRowCompact : null]}>
                <View style={S.bulletBadge}>
                  <View style={S.bullet} />
                </View>
                <Text style={[S.listText, compact ? S.listTextCompact : null]}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={[S.noticeBox, compact ? S.noticeBoxCompact : null]}>
            <Text style={S.noticeText}>
              자세한 내용은 변경된 개인정보처리방침 및 이용약관에서 확인하실 수 있습니다.
            </Text>
            <Text style={S.noticeDate}>시행일자: {POLICY_UPDATE_EFFECTIVE_DATE}</Text>
            <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} hitSlop={8}>
              <Text style={S.link}>개인정보 처리방침</Text>
            </Pressable>
          </View>

          {blocked ? (
            <View style={[S.blockNotice, compact ? S.blockNoticeCompact : null]}>
              <Text style={S.blockNoticeText}>
                동의하지 않으면 Whatta 서비스를 사용할 수 없습니다.
              </Text>
            </View>
          ) : null}

          <View style={[S.buttonRow, compact ? S.buttonRowCompact : null]}>
            <Pressable style={S.secondaryButton} onPress={onDisagree}>
              <Text style={S.secondaryButtonText}>동의하지 않음</Text>
            </Pressable>

            <Pressable style={S.primaryButton} onPress={onAgree}>
              <LinearGradient
                colors={[colors.brand.primary, colors.brand.secondary]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={S.primaryButtonFill}
              >
                <Text style={S.primaryButtonText}>동의 및 계속</Text>
              </LinearGradient>
            </Pressable>
          </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const S = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,17,20,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '88%',
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  cardCompact: {
    maxHeight: '84%',
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
  },
  scrollContent: {
    paddingBottom: 2,
  },
  scrollContentCompact: {
    paddingBottom: 2,
  },
  hero: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  heroCompact: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.74)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroBadgeText: {
    ...ts('label3'),
    color: colors.brand.secondary,
    fontWeight: '700',
  },
  title: {
    ...ts('titleM'),
    marginTop: 10,
    fontSize: 20,
    lineHeight: 26,
    color: colors.text.text1,
    fontWeight: '700',
  },
  titleCompact: {
    marginTop: 8,
    fontSize: 18,
    lineHeight: 24,
  },
  description: {
    ...ts('body1'),
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: '#5C6169',
  },
  descriptionCompact: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    marginTop: 12,
  },
  sectionCompact: {
    marginTop: 10,
  },
  sectionTitle: {
    ...ts('label2'),
    color: colors.text.text1,
    marginBottom: 8,
  },
  listRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    marginTop: 8,
  },
  listRowCompact: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginTop: 6,
  },
  bulletBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bullet: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.brand.secondary,
  },
  listText: {
    ...ts('body1'),
    flex: 1,
    color: '#50565E',
    fontSize: 13,
    lineHeight: 18,
  },
  listTextCompact: {
    fontSize: 12,
    lineHeight: 17,
  },
  noticeBox: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: '#F5F8FB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noticeBoxCompact: {
    marginTop: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeText: {
    ...ts('body2'),
    color: '#78818C',
    fontSize: 11,
    lineHeight: 14,
  },
  noticeDate: {
    ...ts('label3'),
    color: colors.text.text2,
    marginTop: 8,
  },
  link: {
    ...ts('body1'),
    marginTop: 6,
    color: colors.brand.secondary,
    fontWeight: '600',
  },
  blockNotice: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: '#FFF2F2',
    borderWidth: 1,
    borderColor: '#FFD9D9',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  blockNoticeCompact: {
    marginTop: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  blockNoticeText: {
    ...ts('body1'),
    color: '#B34242',
    fontSize: 12,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  buttonRowCompact: {
    marginTop: 12,
  },
  primaryButton: {
    flex: 1.35,
  },
  primaryButtonFill: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...ts('label1'),
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    ...ts('label2'),
    color: '#6C7480',
    fontWeight: '600',
  },
})
