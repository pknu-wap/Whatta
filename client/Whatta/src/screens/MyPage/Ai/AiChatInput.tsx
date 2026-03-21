import React from 'react'
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import AiPlusNoIcon from '@/assets/icons/aiplus_no.svg'
import AiPlusYesIcon from '@/assets/icons/aiplus_yes.svg'
import EnterNoIcon from '@/assets/icons/enter_no.svg'
import EnterYesIcon from '@/assets/icons/enter_yes.svg'
import colors from '@/styles/colors'

type Props = {
  value: string
  previewText: string
  previewActive: boolean
  plusActive: boolean
  disabled?: boolean
  onPressPlus: () => void
  onChangeText: (text: string) => void
  onClearPreview: () => void
  onSubmit: () => void
}

const LINE_HEIGHT = 20
const TEXT_MIN_HEIGHT = 20
const TEXT_MAX_HEIGHT = 100
const WRAP_VERTICAL_PADDING = 7

export default function AiChatInput({
  value,
  previewText,
  previewActive,
  plusActive,
  disabled = false,
  onPressPlus,
  onChangeText,
  onClearPreview,
  onSubmit,
}: Props) {
  const inputRef = React.useRef<TextInput | null>(null)
  const [textHeight, setTextHeight] = React.useState(TEXT_MIN_HEIGHT)

  React.useEffect(() => {
    if (!value) {
      setTextHeight(TEXT_MIN_HEIGHT)
    }
  }, [value])

  const displayPreview = previewActive && value.length === 0
  const visibleTextHeight = Math.max(TEXT_MIN_HEIGHT, Math.min(TEXT_MAX_HEIGHT, textHeight))
  const inputWrapHeight = Math.max(34, visibleTextHeight + WRAP_VERTICAL_PADDING * 2)
  const barHeight = Math.max(50, inputWrapHeight + 8)
  const barRadius = barHeight > 50 ? 20 : 50
  const hasInput = (displayPreview ? previewText : value).trim().length > 0

  return (
    <View style={[S.inputBar, { minHeight: barHeight, borderRadius: barRadius }]}>
      <Pressable style={S.iconButton} onPress={onPressPlus}>
        {plusActive ? <AiPlusYesIcon width={34} height={34} /> : <AiPlusNoIcon width={34} height={34} />}
      </Pressable>

      <Pressable
        style={[S.inputWrap, { minHeight: inputWrapHeight }]}
        onPress={() => {
          if (displayPreview) onClearPreview()
          inputRef.current?.focus()
        }}
      >
        {displayPreview ? (
          <Text style={S.previewText} numberOfLines={1}>
            {previewText}
          </Text>
        ) : null}

        <TextInput
          ref={inputRef}
          value={value}
          onFocus={() => {
            if (displayPreview) onClearPreview()
          }}
          onChangeText={(text) => {
            if (displayPreview) onClearPreview()
            onChangeText(text)
          }}
          style={[
            S.input,
            {
              minHeight: visibleTextHeight,
              color: colors.text.text1,
            },
          ]}
          multiline
          scrollEnabled={false}
          textAlignVertical="top"
          blurOnSubmit={false}
          onContentSizeChange={(event) => {
            const nextHeight = Math.max(
              TEXT_MIN_HEIGHT,
              Math.min(TEXT_MAX_HEIGHT, Math.ceil(event.nativeEvent.contentSize.height)),
            )
            setTextHeight(nextHeight)
          }}
        />
      </Pressable>

      <Pressable
        style={S.iconButtonRight}
        onPress={() => {
          Keyboard.dismiss()
          onSubmit()
        }}
        disabled={disabled || !hasInput}
      >
        {hasInput ? <EnterYesIcon width={34} height={34} /> : <EnterNoIcon width={34} height={34} />}
      </Pressable>
    </View>
  )
}

const S = StyleSheet.create({
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: 358,
    backgroundColor: colors.background.bg2,
    alignSelf: 'center',
    marginBottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonRight: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  inputWrap: {
    flex: 1,
    marginLeft: 8,
    marginRight: 4,
    minWidth: 0,
    justifyContent: 'center',
    paddingVertical: WRAP_VERTICAL_PADDING,
  },
  previewText: {
    position: 'absolute',
    left: 0,
    right: 0,
    color: colors.text.text4,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: LINE_HEIGHT,
    includeFontPadding: false,
  },
  input: {
    width: '100%',
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    margin: 0,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: LINE_HEIGHT,
    letterSpacing: 0,
    includeFontPadding: false,
  },
})
