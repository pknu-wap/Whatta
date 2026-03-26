import React from 'react'
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'

type Props = {
  visible: boolean
  onAgree: () => void
  onDisagree: () => void
}

const PRIVACY_POLICY_URL = 'https://denim-gum-351.notion.site/privacy-policy'

const CONSENT_ITEMS = [
  '입력한 내용',
  '첨부한 사진(사진 접근 권한에 동의한 경우)',
  '현재 날짜와 시간',
] as const

export default function AiDataConsentModal({ visible, onAgree, onDisagree }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDisagree}>
      <View style={S.backdrop}>
        <View style={S.card}>
          <LinearGradient
            colors={['#EEF1FF', '#F6EEFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={S.hero}
          >
            <View style={S.heroBadge}>
              <Text style={S.heroBadgeText}>WHATTA AI</Text>
            </View>
            <Text style={S.title}>AI 데이터 전송 안내</Text>
            <Text style={S.description}>
              AI가 사용자의 요청을 이해하고 처리할 수 있도록, 아래 정보가 OpenAI에 전송될 수
              있습니다.
            </Text>
          </LinearGradient>

          <View style={S.listCard}>
            {CONSENT_ITEMS.map((item, index) => (
              <View
                key={item}
                style={[
                  S.listRow,
                  index === 0 ? null : S.listRowGap,
                ]}
              >
                <View style={S.bulletBadge}>
                  <View style={S.bullet} />
                </View>
                <Text style={S.listText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={S.noticeBox}>
            <Text style={S.footnote}>전송된 데이터는 요청 처리 후 저장되지 않습니다.</Text>
            <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} hitSlop={8}>
              <Text style={S.link}>개인정보 처리방침</Text>
            </Pressable>
          </View>

          <View style={S.buttonRow}>
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
        </View>
      </View>
    </Modal>
  )
}

const S = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,17,20,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  card: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
  },
  hero: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
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
    ...ts('titleL'),
    marginTop: 14,
    fontSize: 22,
    lineHeight: 28,
    color: colors.text.text1,
    fontWeight: '700',
  },
  description: {
    ...ts('body1'),
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: '#5C6169',
  },
  listCard: {
    marginTop: 14,
    gap: 10,
  },
  listRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  listRowGap: {
    marginTop: 0,
  },
  bulletBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand.secondary,
  },
  listText: {
    ...ts('body1'),
    flex: 1,
    color: '#50565E',
    fontSize: 14,
    lineHeight: 20,
  },
  noticeBox: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: '#F5F8FB',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  footnote: {
    ...ts('body2'),
    color: '#78818C',
    textAlign: 'left',
  },
  link: {
    ...ts('body1'),
    marginTop: 8,
    color: colors.brand.secondary,
    textAlign: 'left',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  primaryButton: {
    flex: 1.35,
  },
  primaryButtonFill: {
    height: 58,
    borderRadius: 18,
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
    height: 58,
    borderRadius: 18,
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
