import React from 'react'
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Dimensions,
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
import { preprocessAiImage } from '@/screens/MyPage/Ai/aiImagePreprocess'
import { createEvent, type RepeatRule } from '@/api/event_api'
import { createTask } from '@/api/task'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'
import {
  requestAiChat,
  type AiImagePayload,
  type AiScheduleDraft,
} from '@/api/ai'
import { requestSignedUpload, uploadToSignedUrl } from '@/api/upload'

type Props = NativeStackScreenProps<MyPageStackList, 'AiChat'>

type ChatRole = 'user' | 'assistant' | 'system'

type ChatMessage = {
  id: string
  role: ChatRole
  text: string
  imageUri?: string | null
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
    freeCount?: number
    message?: string
    schedules?: Array<
      (AiScheduleDraft & {
        isSchedule?: boolean
        isScheduled?: boolean
        warnigs?: AiScheduleDraft['warnings']
      }) | null
    > | null
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
const DAILY_FREE_GENERATION_LIMIT = 3
const LOADING_STEPS = [
  '요청을 이해하고 있어요...',
  '정보를 정리하고 있어요...',
  '등록할 형식으로 바꾸고 있어요...',
] as const
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getDayKey(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function base64ToBlob(base64: string, contentType: string) {
  const response = await fetch(`data:${contentType};base64,${base64}`)
  return response.blob()
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
        warnings: { image: ['이미지 기반 예시 데이터입니다.'] },
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
      !!item &&
      (item as { isSchedule?: boolean; isScheduled?: boolean }).isSchedule !== false &&
      (item as { isScheduled?: boolean }).isScheduled !== false,
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

function toRepeatRule(repeat: DraftItem['repeat']): RepeatRule | null {
  if (!repeat?.unit || !repeat.interval) return null

  return {
    interval: repeat.interval,
    unit: repeat.unit,
    on: repeat.on ?? [],
    endDate: repeat.endDate ?? null,
    exceptionDates: repeat.exceptionDates ?? [],
  }
}

function toEventPayload(item: DraftItem) {
  return {
    title: item.title.trim(),
    labels: item.labelIds ?? [],
    startDate: item.startDate!,
    endDate: item.endDate ?? item.startDate!,
    startTime: item.startTime ?? null,
    endTime: item.endTime ?? null,
    repeat: toRepeatRule(item.repeat),
    colorKey: (item.colorHex ?? '#B04FFF').replace('#', ''),
  }
}

function toTaskPayload(item: DraftItem) {
  return {
    title: item.title.trim(),
    labels: item.labelIds ?? [],
    placementDate: item.startDate ?? null,
    dueDateTime: item.dueDateTime ?? null,
    repeat: toRepeatRule(item.repeat),
  }
}

function ChatBubble({
  item,
  spacing = 24,
  onPressImage,
}: {
  item: ChatMessage
  spacing?: number
  onPressImage?: (uri: string) => void
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
        {item.imageUri ? (
          <Pressable onPress={() => onPressImage?.(item.imageUri!)} hitSlop={6}>
            <Image source={{ uri: item.imageUri }} style={S.userBubbleImage} />
          </Pressable>
        ) : null}
        {item.text ? (
          <Text style={[S.bubbleText, S.userBubbleText]}>{item.text}</Text>
        ) : null}
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

function LoadingText({ text }: { text: string }) {
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
  const [imageUploading, setImageUploading] = React.useState(false)
  const [previewImageUri, setPreviewImageUri] = React.useState<string | null>(null)
  const [attachedImageName, setAttachedImageName] = React.useState('')
  const [selectedStarterPrompt, setSelectedStarterPrompt] = React.useState<string | null>(null)
  const [isStarterPreviewActive, setIsStarterPreviewActive] = React.useState(false)
  const [usageDayKey, setUsageDayKey] = React.useState(() => getDayKey())
  const [freeUsedCount, setFreeUsedCount] = React.useState(0)
  const [serverFreeCount, setServerFreeCount] = React.useState<number | null>(null)
  const [loadingStepIndex, setLoadingStepIndex] = React.useState(0)
  const starterPreviewText =
    STARTER_PROMPTS.find((item) => item.label === selectedStarterPrompt)?.preview ?? ''
  const effectiveInput = isStarterPreviewActive ? starterPreviewText : input
  const plusActive = imageSheetOpen || !!attachedImage
  const localFreeRemainingCount = Math.max(0, DAILY_FREE_GENERATION_LIMIT - freeUsedCount)
  const freeRemainingCount = serverFreeCount ?? localFreeRemainingCount

  React.useEffect(() => {
    const todayKey = getDayKey()
    if (todayKey !== usageDayKey) {
      setUsageDayKey(todayKey)
      setFreeUsedCount(0)
      setServerFreeCount(null)
    }
  }, [usageDayKey])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true })
    }, 60)
    return () => clearTimeout(timer)
  }, [messages, draftGroups, loading])

  React.useEffect(() => {
    if (!loading) {
      setLoadingStepIndex(0)
      return
    }

    const interval = setInterval(() => {
      setLoadingStepIndex((prev) => (prev + 1) % LOADING_STEPS.length)
    }, 1400)

    return () => clearInterval(interval)
  }, [loading])

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

  const pushMessage = React.useCallback((role: ChatRole, text: string, imageUri?: string | null) => {
    const nextMessage = { id: makeId(role), role, text, imageUri: imageUri ?? null }
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
        if (item.isEvent) {
          await createEvent(toEventPayload(item))
        } else {
          await createTask(toTaskPayload(item))
        }
        upsertDraft(item.id, { saving: false, saved: true })
        setFreeUsedCount((prev) => Math.min(DAILY_FREE_GENERATION_LIMIT, prev + 1))
        setServerFreeCount((prev) => (prev == null ? prev : Math.max(0, prev - 1)))
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
      const submittedImage = attachedImage

      if (!text && !submittedImage?.objectKey) {
        Alert.alert('입력이 필요해요', EMPTY_GUIDE)
        return
      }

      if (imageUploading) {
        Alert.alert('이미지 업로드 중이에요', '이미지 업로드가 끝나면 전송해 주세요.')
        return
      }

      setHasStartedChat(true)
      setImageSheetOpen(false)
      setAttachedImage(null)
      setAttachedImageName('')
      pushMessage('user', text, submittedImage?.url ?? null)
      setInput('')
      setSelectedStarterPrompt(null)
      setIsStarterPreviewActive(false)
      setLoading(true)
      setLoadingStepIndex(0)

      try {
        const response = await requestAiChat({
          text,
          image: submittedImage?.objectKey
            ? { objectKey: submittedImage.objectKey }
            : null,
        })
        if (typeof response.data?.freeCount === 'number') {
          setServerFreeCount(response.data.freeCount)
        }
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
            warnings:
              (item as { warnings?: DraftItem['warnings']; warnigs?: DraftItem['warnings'] }).warnings ??
              (item as { warnigs?: DraftItem['warnings'] }).warnigs ??
              null,
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
      }
    },
    [attachedImage, effectiveInput, imageUploading, pushMessage],
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
                const spacing = nextEntry?.type === 'draft-group' ? 8 : 24
                return (
                  <ChatBubble
                    key={entry.id}
                    item={item}
                    spacing={spacing}
                    onPressImage={setPreviewImageUri}
                  />
                )
              }

              const group = draftGroupMap.get(entry.groupId)
              if (!group || group.items.length === 0) return null
              const hasSaveAll = group.items.length > 1 && group.items.some((item) => !item.saved)
              const needsExtraGap = nextEntry?.type === 'message'
              const needsMoreGap = hasSaveAll && nextEntry?.type === 'message'

              return (
                <View
                  key={entry.id}
                  style={[
                    S.draftSection,
                    group.items.length > 1 && S.draftSectionMultiple,
                    needsExtraGap && S.draftSectionBeforeNextMessage,
                    needsMoreGap && S.draftSectionAfterSaveAll,
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
                    <View style={S.saveAllWrap}>
                      <Pressable style={S.saveAllOutline} onPress={() => saveAll(group.items)}>
                        <Text style={S.saveAllOutlineText}>모두 등록하기</Text>
                      </Pressable>
                    </View>
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

            {loading ? <LoadingText text={LOADING_STEPS[loadingStepIndex]} /> : null}

          </ScrollView>

          <AiChatInput
            value={input}
            previewText={starterPreviewText}
            previewActive={isStarterPreviewActive}
            plusActive={plusActive}
            imagePreviewUri={attachedImage?.url ?? null}
            disabled={loading || imageUploading}
            onPressPlus={() => setImageSheetOpen(true)}
            onChangeText={setInput}
            onClearPreview={() => {
              setSelectedStarterPrompt(null)
              setIsStarterPreviewActive(false)
            }}
            onRemoveImage={() => {
              setAttachedImage(null)
              setAttachedImageName('')
            }}
            onSubmit={() => submit()}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>

      <AddImageSheet
        visible={imageSheetOpen}
        onClose={() => setImageSheetOpen(false)}
        onPickImage={async (uri, base64, ext) => {
          setImageSheetOpen(false)
          setImageUploading(true)

          try {
            const prepared = await preprocessAiImage({ uri, base64, ext })
            const draftImage: AiImagePayload = {
              format: prepared.format,
              data: prepared.base64,
              url: prepared.uri,
              objectKey: null,
            }
            setAttachedImage(draftImage)
            setAttachedImageName(uri.split('/').pop() || '선택한 이미지')

            const uploadMeta = await requestSignedUpload({
              intent: 'AGENT_IMAGE',
              target: 'AGENT_IMAGE',
              contentType: prepared.contentType,
            })
            const blob = await base64ToBlob(prepared.base64, prepared.contentType)
            await uploadToSignedUrl({
              signedUrl: uploadMeta.signedUrl,
              httpMethod: uploadMeta.httpMethod,
              requiredHeaders: uploadMeta.requiredHeaders,
              contentType: prepared.contentType,
              body: blob,
            })
            setAttachedImage((prev) =>
              prev?.url === prepared.uri
                ? { ...prev, objectKey: uploadMeta.objectKey }
                : prev,
            )
          } catch (error) {
            console.error('AI image upload failed', error)
            console.error('AI image upload failed response', (error as any)?.response?.data)
            setAttachedImage(null)
            setAttachedImageName('')
            Alert.alert('이미지 업로드 실패', '이미지를 업로드하지 못했어요. 다시 시도해 주세요.')
          } finally {
            setImageUploading(false)
          }
        }}
        onTakePhoto={async (uri, base64, ext) => {
          const draftImage: AiImagePayload = {
            format: 'jpg',
            data: '',
            url: uri,
            objectKey: null,
          }
          setImageSheetOpen(false)
          setAttachedImageName(uri.split('/').pop() || '촬영한 이미지')
          setImageUploading(true)

          try {
            const prepared = await preprocessAiImage({ uri, base64, ext })
            setAttachedImage({
              ...draftImage,
              format: prepared.format,
              data: prepared.base64,
              url: prepared.uri,
            })
            const uploadMeta = await requestSignedUpload({
              intent: 'AGENT_IMAGE',
              target: 'AGENT_IMAGE',
              contentType: prepared.contentType,
            })
            const blob = await base64ToBlob(prepared.base64, prepared.contentType)
            await uploadToSignedUrl({
              signedUrl: uploadMeta.signedUrl,
              httpMethod: uploadMeta.httpMethod,
              requiredHeaders: uploadMeta.requiredHeaders,
              contentType: prepared.contentType,
              body: blob,
            })
            setAttachedImage((prev) =>
              prev?.url === prepared.uri
                ? { ...prev, objectKey: uploadMeta.objectKey }
                : prev,
            )
          } catch (error) {
            console.error('AI image upload failed', error)
            console.error('AI image upload failed response', (error as any)?.response?.data)
            setAttachedImage(null)
            setAttachedImageName('')
            Alert.alert('이미지 업로드 실패', '이미지를 업로드하지 못했어요. 다시 시도해 주세요.')
          } finally {
            setImageUploading(false)
          }
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

      <Modal
        transparent
        visible={!!previewImageUri}
        animationType="fade"
        onRequestClose={() => setPreviewImageUri(null)}
      >
        <View style={S.imageViewerBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPreviewImageUri(null)} />
          <SafeAreaView style={S.imageViewerSafeArea} edges={['top', 'bottom']} pointerEvents="box-none">
            <Pressable style={S.imageViewerClose} onPress={() => setPreviewImageUri(null)}>
              <XIcon width={20} height={20} color="#FFFFFF" />
            </Pressable>
            {previewImageUri ? (
              <View style={S.imageViewerCenter} pointerEvents="box-none">
                <Pressable style={S.imageViewerImageWrap} onPress={() => {}}>
                <Image
                  source={{ uri: previewImageUri }}
                  style={S.imageViewerImage}
                  resizeMode="contain"
                />
                </Pressable>
              </View>
            ) : null}
          </SafeAreaView>
        </View>
      </Modal>
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
  userBubbleImage: {
    width: 92,
    height: 92,
    borderRadius: 16,
    marginBottom: 10,
  },
  imageViewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(9,10,13,0.92)',
  },
  imageViewerSafeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  imageViewerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 72,
    right: 20,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  imageViewerImageWrap: {
    width: SCREEN_WIDTH * 0.88,
    height: SCREEN_HEIGHT * 0.64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
    alignSelf: 'center',
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
    marginTop: 8,
    gap: 16,
  },
  draftSectionMultiple: {
    gap: 12,
  },
  draftSectionBeforeNextMessage: {
    marginBottom: 16,
  },
  draftSectionAfterSaveAll: {
    marginBottom: 20,
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
    width: 95,
    height: 44,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveAllWrap: {
    width: 250,
    alignSelf: 'flex-start',
    alignItems: 'flex-end',
  },
  saveAllOutlineText: {
    ...ts('label2'),
    color: '#FFFFFF',
  },
})
