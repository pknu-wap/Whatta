import React from 'react'
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  Easing,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MyPageStackList } from '@/navigation/MyPageStack'
import XIcon from '@/assets/icons/xL.svg'
import AddImageSheet from '@/screens/More/Ocr'
import AiCard, { type AiCardDraftItem } from '@/screens/MyPage/Ai/AiCard'
import AiChatInput from '@/screens/MyPage/Ai/AiChatInput'
import AiEditSheet from '@/screens/MyPage/Ai/AiEditSheet'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import {
  type AiImagePayload,
  type AiScheduleDraft,
} from '@/api/ai'

type Props = NativeStackScreenProps<MyPageStackList, 'AiChat'>

type ChatRole = 'user' | 'assistant' | 'system'

type ChatMessage = {
  id: string
  role: ChatRole
  text: string
}

type DraftItem = AiCardDraftItem

type DraftGroup = {
  id: string
  items: DraftItem[]
}

type TimelineItem =
  | { id: string; type: 'message'; messageId: string }
  | { id: string; type: 'draft-group'; groupId: string }

type AiChatResponseBody = {
  statusCode?: string
  message?: string
  data?: {
    message?: string
    schedules?: Array<(AiScheduleDraft & { isSchedule?: boolean }) | null> | null
  } | null
}

const STARTER_PROMPTS = [
  {
    label: '일정을 추가하고 싶어요',
    preview: '예: 내일 7시에 왓타 회의 추가해줘',
  },
  {
    label: '여러 일정을 한 번에 추가하고 싶어요',
    preview: '예: 내일 3시 팀 미팅, 7시 약속 추가해줘',
  },
  {
    label: '사진으로 일정을 추가하고 싶어요',
    preview: '예: 이 이미지 보고 일정으로 정리해줘',
  },
] as const

const EMPTY_GUIDE = '자유 대화는 지원하지 않아요. 일정이나 할 일을 생성할 문장을 입력해 주세요.'
const DESIGN_MOCK_MODE = true
const DAILY_FREE_GENERATION_LIMIT = 3

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getDayKey(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildMockSchedules(text: string): AiScheduleDraft[] {
  const trimmed = text.trim()
  const lower = trimmed.toLowerCase()
  const hasMulti = trimmed.includes('여러') || trimmed.includes(',') || trimmed.includes(' 그리고 ')
  const isTask = trimmed.includes('할 일') || lower.includes('task')

  if (hasMulti) {
    return [
      {
        isEvent: true,
        title: '왓타 회의',
        startDate: '2026-03-21',
        endDate: '2026-03-21',
        startTime: '19:00:00',
        endTime: '20:00:00',
        dueDateTime: null,
        repeat: null,
        warnings: null,
      },
      {
        isEvent: !isTask,
        title: isTask ? '저녁 약속 준비' : '저녁 약속',
        startDate: '2026-03-21',
        endDate: '2026-03-21',
        startTime: isTask ? null : '20:30:00',
        endTime: isTask ? null : '22:00:00',
        dueDateTime: isTask ? '2026-03-21T18:00:00' : null,
        repeat: null,
        warnings: null,
      },
    ]
  }

  if (trimmed.includes('사진') || trimmed.includes('이미지')) {
    return [
      {
        isEvent: true,
        title: '이미지에서 추출한 일정',
        startDate: '2026-03-22',
        endDate: '2026-03-22',
        startTime: '09:00:00',
        endTime: '10:00:00',
        dueDateTime: null,
        repeat: null,
        warnings: { image: '이미지 기반 예시 데이터입니다.' },
      },
    ]
  }

  if (isTask) {
    return [
      {
        isEvent: false,
        title: '왓타 회의 준비',
        startDate: '2026-03-21',
        endDate: null,
        startTime: null,
        endTime: null,
        dueDateTime: '2026-03-21T18:00:00',
        repeat: null,
        warnings: null,
      },
    ]
  }

  return [
    {
      isEvent: true,
      title: '왓타 회의',
      startDate: '2026-03-21',
      endDate: '2026-03-21',
      startTime: '19:00:00',
      endTime: '20:00:00',
      dueDateTime: null,
      repeat: null,
      warnings: null,
    },
  ]
}

async function getMockAiResult(text: string) {
  const schedules = buildMockSchedules(text)
  await sleep(5000)
  return {
    statusCode: '200',
    message: 'OK',
    data: {
      message:
        schedules.length > 1
          ? `${schedules.length}개의 일정을 추가할까요?`
          : '일정 생성을 완료했어요. 이대로 등록할까요?',
      schedules,
    },
  } satisfies AiChatResponseBody
}

function parseAiSchedules(response: AiChatResponseBody) {
  const schedules = response.data?.schedules ?? []

  return schedules.filter(
    (item): item is AiScheduleDraft =>
      !!item && (item as { isSchedule?: boolean }).isSchedule !== false,
  )
}

function validateDraft(item: DraftItem) {
  if (!item.title.trim()) return '제목을 입력해 주세요.'

  if (item.isEvent) {
    if (!item.startDate) return '일정 시작 날짜를 입력해 주세요.'
    if (!item.endDate) return '일정 종료 날짜를 입력해 주세요.'
    return null
  }

  if (!item.startDate && !item.dueDateTime) {
    return '할 일 날짜 또는 마감일 중 하나는 필요해요.'
  }

  return null
}

function ChatBubble({
  item,
  spacing = 24,
}: {
  item: ChatMessage
  spacing?: number
}) {
  const isUser = item.role === 'user'
  const isSystem = item.role === 'system'

  if (isSystem) {
    return <Text style={[S.systemText, { marginBottom: spacing }]}>{item.text}</Text>
  }

  if (!isUser) {
    return (
      <View style={[S.bubbleRow, S.bubbleRowAssistant, { marginBottom: spacing }]}>
        <Text style={[S.bubbleText, S.assistantPlainText]}>{item.text}</Text>
      </View>
    )
  }

  return (
    <View style={[S.bubbleRow, S.bubbleRowUser, { marginBottom: spacing }]}>
      <View style={[S.bubble, S.userBubble]}>
        <Text style={[S.bubbleText, S.userBubbleText]}>
          {item.text}
        </Text>
      </View>
    </View>
  )
}

function IntroTitle({ text }: { text: string }) {
  return (
    <View style={S.introWrap}>
      <Text style={S.introText}>{text}</Text>
    </View>
  )
}

function LoadingText() {
  const text = '요청을 분석 중이에요...'
  const chars = React.useMemo(() => text.split(''), [text])
  const progress = useSharedValue(0)

  React.useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    )
  }, [progress])

  return (
    <View style={S.loadingWrap}>
      <View style={S.loadingCharsRow}>
        {chars.map((char, index) => (
          <LoadingChar
            key={`${char}-${index}`}
            char={char}
            index={index}
            total={chars.length}
            progress={progress}
          />
        ))}
      </View>
    </View>
  )
}

function LoadingChar({
  char,
  index,
  total,
  progress,
}: {
  char: string
  index: number
  total: number
  progress: SharedValue<number>
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const current = progress.value * (total - 1)
    const distance = Math.abs(current - index)
    const emphasis = Math.max(0, 1 - distance / 2)

    return {
      color: interpolateColor(
        emphasis,
        [0, 1],
        ['#FFFFFF', '#E7BEFF'],
      ),
      textShadowColor: interpolateColor(
        emphasis,
        [0, 1],
        ['rgba(0,0,0,0)', 'rgba(214,140,255,0.55)'],
      ),
      textShadowRadius: 10 * emphasis,
    }
  })

  return (
    <Animated.Text style={[S.loadingText, animatedStyle]}>
      {char === ' ' ? '\u00A0' : char}
    </Animated.Text>
  )
}

export default function AiChatScreen({ navigation }: Props) {
  const scrollRef = React.useRef<ScrollView | null>(null)
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: makeId('assistant'),
      role: 'assistant',
      text: '안녕하세요.\n무엇을 도와드릴까요?',
    },
  ])
  const [hasStartedChat, setHasStartedChat] = React.useState(false)
  const [input, setInput] = React.useState('')
  const [draftGroups, setDraftGroups] = React.useState<DraftGroup[]>([])
  const [timeline, setTimeline] = React.useState<TimelineItem[]>([])
  const [editingDraftId, setEditingDraftId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [keyboardHeight, setKeyboardHeight] = React.useState(0)
  const [imageSheetOpen, setImageSheetOpen] = React.useState(false)
  const [attachedImage, setAttachedImage] = React.useState<AiImagePayload | null>(null)
  const [attachedImageName, setAttachedImageName] = React.useState('')
  const [selectedStarterPrompt, setSelectedStarterPrompt] = React.useState<string | null>(null)
  const [isStarterPreviewActive, setIsStarterPreviewActive] = React.useState(false)
  const [usageDayKey, setUsageDayKey] = React.useState(() => getDayKey())
  const [freeUsedCount, setFreeUsedCount] = React.useState(0)
  const starterPreviewText =
    STARTER_PROMPTS.find((item) => item.label === selectedStarterPrompt)?.preview ?? ''
  const effectiveInput = isStarterPreviewActive ? starterPreviewText : input
  const plusActive = imageSheetOpen || !!attachedImage
  const freeRemainingCount = Math.max(0, DAILY_FREE_GENERATION_LIMIT - freeUsedCount)

  React.useEffect(() => {
    const todayKey = getDayKey()
    if (todayKey !== usageDayKey) {
      setUsageDayKey(todayKey)
      setFreeUsedCount(0)
    }
  }, [usageDayKey])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true })
    }, 60)
    return () => clearTimeout(timer)
  }, [messages, draftGroups, loading])

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height)
      if (!hasStartedChat) return
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true })
      }, 50)
    })

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0)
    })

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [hasStartedChat])

  const pushMessage = React.useCallback((role: ChatRole, text: string) => {
    const nextMessage = { id: makeId(role), role, text }
    setMessages((prev) => [...prev, nextMessage])
    setTimeline((prev) => [
      ...prev,
      { id: makeId('timeline-message'), type: 'message', messageId: nextMessage.id },
    ])
  }, [])

  const upsertDraft = React.useCallback((id: string, patch: Partial<DraftItem>) => {
    setDraftGroups((prev) =>
      prev.map((group) => ({
        ...group,
        items: group.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      })),
    )
  }, [])

  const removeDraft = React.useCallback((id: string) => {
    let emptyGroupId: string | null = null
    setDraftGroups((prev) =>
      prev
        .map((group) => {
          const nextItems = group.items.filter((item) => item.id !== id)
          if (nextItems.length === 0) emptyGroupId = group.id
          return { ...group, items: nextItems }
        })
        .filter((group) => group.items.length > 0),
    )
    if (emptyGroupId) {
      setTimeline((prev) =>
        prev.filter((item) => !(item.type === 'draft-group' && item.groupId === emptyGroupId)),
      )
    }
  }, [])

  const editingDraft = React.useMemo(
    () =>
      draftGroups.flatMap((group) => group.items).find((item) => item.id === editingDraftId) ?? null,
    [draftGroups, editingDraftId],
  )
  const messageMap = React.useMemo(
    () => new Map(messages.map((item) => [item.id, item])),
    [messages],
  )
  const draftGroupMap = React.useMemo(
    () => new Map(draftGroups.map((group) => [group.id, group])),
    [draftGroups],
  )

  const saveDraft = React.useCallback(
    async (item: DraftItem) => {
      const todayKey = getDayKey()
      const nextUsedCount = todayKey !== usageDayKey ? 0 : freeUsedCount
      if (todayKey !== usageDayKey) {
        setUsageDayKey(todayKey)
        setFreeUsedCount(0)
      }

      if (nextUsedCount >= DAILY_FREE_GENERATION_LIMIT) {
        Alert.alert('무료 생성 횟수를 모두 사용했어요', '오늘의 무료 일정 생성 기회를 모두 사용했어요.')
        return
      }

      const errorMessage = validateDraft(item)
      if (errorMessage) {
        Alert.alert('저장할 수 없어요', errorMessage)
        return
      }

      upsertDraft(item.id, { saving: true })
      try {
        if (DESIGN_MOCK_MODE) {
          await sleep(350)
        }
        upsertDraft(item.id, { saving: false, saved: true })
        setFreeUsedCount((prev) => Math.min(DAILY_FREE_GENERATION_LIMIT, prev + 1))
      } catch (error) {
        console.error('AI draft save failed', error)
        upsertDraft(item.id, { saving: false })
        Alert.alert('오류', '생성된 일정을 저장하지 못했어요.')
      }
    },
    [freeUsedCount, upsertDraft, usageDayKey],
  )

  const saveAll = React.useCallback(async (items: DraftItem[]) => {
    for (const item of items) {
      if (!item.saved) {
        await saveDraft(item)
      }
    }
  }, [saveDraft])

  const submit = React.useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? effectiveInput).trim()
      if (!text) {
        Alert.alert('입력이 필요해요', EMPTY_GUIDE)
        return
      }

      setHasStartedChat(true)
      pushMessage('user', text)
      setInput('')
      setSelectedStarterPrompt(null)
      setIsStarterPreviewActive(false)
      setLoading(true)

      try {
        const response = await getMockAiResult(text)
        const schedules = parseAiSchedules(response)

        pushMessage(
          'assistant',
          response.data?.message || '생성 결과를 확인해 주세요.',
        )

        if (schedules.length > 0) {
          const nextGroupId = makeId('draft-group')
          const nextDrafts = schedules.map((item) => ({
            ...item,
            id: makeId('draft'),
            title: item.title || '',
            startDate: item.startDate ?? null,
            endDate: item.endDate ?? item.startDate ?? null,
            startTime: item.startTime ?? null,
            endTime: item.endTime ?? null,
            dueDateTime: item.dueDateTime ?? null,
            repeat: item.repeat ?? null,
            warnings: (item as any).warnings ?? (item as any).warnigs ?? null,
            colorHex: '#B04FFF',
            labelIds: [],
            saved: false,
            saving: false,
          }))
          setDraftGroups((prev) => [...prev, { id: nextGroupId, items: nextDrafts }])
          setTimeline((prev) => [
            ...prev,
            { id: makeId('timeline-draft-group'), type: 'draft-group', groupId: nextGroupId },
          ])
        }

        if (schedules.length === 0) {
          pushMessage('system', EMPTY_GUIDE)
        }
      } catch (error: any) {
        console.error('AI chat request failed', error)
        const message =
          error?.response?.data?.message ?? 'AI 요청 처리 중 오류가 발생했어요.'
        pushMessage('assistant', message)
      } finally {
        setLoading(false)
        setAttachedImage(null)
        setAttachedImageName('')
      }
    },
    [effectiveInput, freeUsedCount, pushMessage, usageDayKey],
  )

  return (
    <LinearGradient colors={['#B04FFF', '#5273FF']} style={S.gradient}>
      <SafeAreaView style={S.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={S.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={S.header}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
              <XIcon width={20} height={20} color={colors.icon.default} />
            </Pressable>
            <View style={S.headerCenter}>
              <Text style={S.headerCaption}>오늘 남은 무료 생성</Text>
              <Text style={S.headerCount}>{freeRemainingCount}회</Text>
            </View>
            <View style={S.headerRight}>
              <View style={S.headerTag}>
                <Text style={S.headerTagText}>더 대화하기</Text>
              </View>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            style={S.flex}
            contentContainerStyle={[
              S.scrollContent,
              hasStartedChat && S.scrollContentStarted,
              hasStartedChat && keyboardHeight > 0 && { paddingBottom: keyboardHeight * 0.25 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!hasStartedChat ? <IntroTitle text={messages[0].text} /> : null}

            {timeline.map((entry, index) => {
              const nextEntry = timeline[index + 1]

              if (entry.type === 'message') {
                const item = messageMap.get(entry.messageId)
                if (!item) return null
                const spacing = nextEntry?.type === 'draft-group' ? 12 : 24
                return <ChatBubble key={entry.id} item={item} spacing={spacing} />
              }

              const group = draftGroupMap.get(entry.groupId)
              if (!group || group.items.length === 0) return null
              const hasSaveAll = group.items.length > 1 && group.items.some((item) => !item.saved)
              const needsExtraGap = hasSaveAll && nextEntry?.type === 'message'

              return (
                <View
                  key={entry.id}
                  style={[
                    S.draftSection,
                    group.items.length > 1 && S.draftSectionMultiple,
                    needsExtraGap && S.draftSectionAfterSaveAll,
                  ]}
                >
                  {group.items.map((item) => (
                    <AiCard
                      key={item.id}
                      item={item}
                      onChange={(patch) => upsertDraft(item.id, patch)}
                      onSave={() => saveDraft(item)}
                      onEdit={() => setEditingDraftId(item.id)}
                      onDelete={() => removeDraft(item.id)}
                      showDelete={group.items.length > 1}
                    />
                  ))}
                  {hasSaveAll ? (
                    <Pressable style={S.saveAllOutline} onPress={() => saveAll(group.items)}>
                      <Text style={S.saveAllOutlineText}>모두 등록하기</Text>
                    </Pressable>
                  ) : null}
                </View>
              )
            })}

            {!hasStartedChat ? (
              <View style={S.starterWrap}>
                {STARTER_PROMPTS.map((prompt) => (
                  <Pressable
                    key={prompt.label}
                    style={[
                      S.starterChip,
                      selectedStarterPrompt === prompt.label && S.starterChipSelected,
                    ]}
                    onPress={() => {
                      if (selectedStarterPrompt === prompt.label) {
                        setSelectedStarterPrompt(null)
                        setIsStarterPreviewActive(false)
                        setInput('')
                        return
                      }
                      setSelectedStarterPrompt(prompt.label)
                      setInput('')
                      setIsStarterPreviewActive(true)
                    }}
                  >
                    <View
                      style={[
                        S.starterChipInner,
                        selectedStarterPrompt === prompt.label && S.starterChipInnerSelected,
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          S.starterText,
                          selectedStarterPrompt === prompt.label && S.starterTextSelected,
                        ]}
                      >
                        {prompt.label}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {loading ? <LoadingText /> : null}

          </ScrollView>

          {attachedImageName ? (
            <View style={S.attachmentPill}>
              <Text style={S.attachmentText} numberOfLines={1}>
                {attachedImageName}
              </Text>
            </View>
          ) : null}

          <AiChatInput
            value={input}
            previewText={starterPreviewText}
            previewActive={isStarterPreviewActive}
            plusActive={plusActive}
            disabled={loading}
            onPressPlus={() => setImageSheetOpen(true)}
            onChangeText={setInput}
            onClearPreview={() => {
              setSelectedStarterPrompt(null)
              setIsStarterPreviewActive(false)
            }}
            onSubmit={() => submit()}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>

      <AddImageSheet
        visible={imageSheetOpen}
        onClose={() => setImageSheetOpen(false)}
        onPickImage={(uri, base64, ext) => {
          setAttachedImage({
            format: ext || 'jpg',
            data: base64,
            url: uri,
          })
          setAttachedImageName(uri.split('/').pop() || '선택한 이미지')
        }}
        onTakePhoto={(uri, base64, ext) => {
          setAttachedImage({
            format: ext || 'jpg',
            data: base64,
            url: uri,
          })
          setAttachedImageName(uri.split('/').pop() || '촬영한 이미지')
        }}
      />

      <AiEditSheet
        visible={!!editingDraft}
        item={editingDraft}
        onChange={(patch) => {
          if (!editingDraftId) return
          upsertDraft(editingDraftId, patch)
        }}
        onClose={() => setEditingDraftId(null)}
      />
    </LinearGradient>
  )
}

const S = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
    position: 'relative',
    minHeight: 40,
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  headerCaption: {
    ...ts('label4'),
    color: '#FFFFFF',
    fontSize: 14
  },
  headerCount: {
    ...ts('label2'),
    color: '#FFFFFF',
    marginTop: 2,
  },
  headerRight: {
    width: 75,
    height: 30,
    marginLeft: 'auto',
  },
  headerTag: {
    width: 75,
    height: 30,
    backgroundColor: colors.icon.selected,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTagText: {
    ...ts('label4'),
    color: colors.text.text1w,
    fontWeight: 700,
    fontSize: 13
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 18,
  },
  scrollContentStarted: {
    paddingTop: 33,
  },
  introWrap: {
    alignItems: 'center',
    marginTop: 46,
  },
  introText: {
    ...ts('titleL'),
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 28,
    fontSize: 24
  },
  bubbleRow: {
    width: '100%',
  },
  bubbleRowUser: {
    alignItems: 'flex-end',
  },
  bubbleRowAssistant: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  userBubble: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  bubbleText: {
    ...ts('date1'),
    fontSize: 16,
  },
  userBubbleText: {
    color: colors.text.text1w,
  },
  assistantPlainText: {
    ...ts('date1'),
    color: '#FFFFFF',
    maxWidth: '90%',
    fontSize: 17
  },
  systemText: {
    ...ts('body2'),
    color: 'rgba(255,255,255,0.88)',
    marginBottom: 12,
  },
  starterWrap: {
    alignItems: 'center',
    gap: 16,
    marginTop: 32,
  },
  starterChip: {
    backgroundColor: '#FFFFFF',
    height: 50,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    padding: 1.5,
  },
  starterChipSelected: {
    backgroundColor: '#FFFFFF',
  },
  starterChipInner: {
    height: '100%',
    width: '100%',
    borderRadius: 18.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  starterChipInnerSelected: {
    backgroundColor: colors.primary.main,
  },
  starterText: {
    ...ts('label2'),
    color: colors.primary.main,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 20,
    includeFontPadding: false,
  },
  starterTextSelected: {
    color: colors.text.text1w,
  },
  loadingWrap: {
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 10,
  },
  loadingCharsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    ...ts('date1'),
    color: '#FFFFFF',
  },
  draftSection: {
    marginTop: 12,
    gap: 16,
  },
  draftSectionMultiple: {
    gap: 12,
  },
  draftSectionAfterSaveAll: {
    marginBottom: 12,
  },
  saveButton: {
    width: 95,
    height: 44,
    alignSelf: 'flex-end',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDone: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.5)',
  },
  saveButtonText: {
    ...ts('label2'),
    color: '#FFFFFF',
  },
  saveAllOutline: {
    alignSelf: 'flex-end',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  saveAllOutlineText: {
    ...ts('label3'),
    color: '#FFFFFF',
  },
  attachmentPill: {
    alignSelf: 'flex-start',
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: '70%',
  },
  attachmentText: {
    ...ts('body2'),
    color: '#FFFFFF',
  },
})
