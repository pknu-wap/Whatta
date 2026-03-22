import React from 'react'
import { Image, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import XIcon from '@/assets/icons/xL.svg'
import AiPlusNoIcon from '@/assets/icons/aiplus_no.svg'
import AiPlusYesIcon from '@/assets/icons/aiplus_yes.svg'
import EnterNoIcon from '@/assets/icons/enter_no.svg'
import EnterYesIcon from '@/assets/icons/enter_yes.svg'
import PicIcon from '@/assets/icons/pic.svg'
import CameraIcon from '@/assets/icons/camera.svg'
import colors from '@/styles/colors'
import { ts } from '@/styles/typography'

type Props = {
  value: string
  previewText: string
  previewActive: boolean
  plusActive: boolean
  attachmentMenuOpen?: boolean
  imagePreviewUri?: string | null
  disabled?: boolean
  onPressPlus: () => void
  onPressAlbum: () => void
  onPressCamera: () => void
  onChangeText: (text: string) => void
  onClearPreview: () => void
  onRemoveImage: () => void
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
  attachmentMenuOpen = false,
  imagePreviewUri = null,
  disabled = false,
  onPressPlus,
  onPressAlbum,
  onPressCamera,
  onChangeText,
  onClearPreview,
  onRemoveImage,
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
  const hasInput = (displayPreview ? previewText : value).trim().length > 0 || !!imagePreviewUri
  const canSubmit = hasInput && !disabled
  const attachmentMenuBottom = barHeight + (imagePreviewUri ? 96 : 24)

  return (
    <View style={S.wrap}>
      {attachmentMenuOpen ? (
        <View style={[S.attachmentMenuRow, { bottom: attachmentMenuBottom }]}>
          <Pressable style={S.attachmentCard} onPress={onPressAlbum}>
            <PicIcon width={24} height={24} color={colors.icon.default} />
            <Text style={S.attachmentCardText}>앨범에서{'\n'}가져오기</Text>
          </Pressable>
          <Pressable style={S.attachmentCard} onPress={onPressCamera}>
            <CameraIcon width={24} height={24} color={colors.icon.default} />
            <Text style={S.attachmentCardText}>사진 촬영</Text>
          </Pressable>
        </View>
      ) : null}

      {imagePreviewUri ? (
        <View style={[S.imagePreviewRow, { bottom: barHeight + 16 }]}>
          <View style={S.imagePreviewCard}>
            <Image source={{ uri: imagePreviewUri }} style={S.imagePreview} />
            <Pressable style={S.removeImageButton} onPress={onRemoveImage} hitSlop={8}>
              <View style={S.removeImageButtonInner}>
                <XIcon width={10} height={10} color="#FFFFFF" />
              </View>
            </Pressable>
          </View>
        </View>
      ) : null}

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
          disabled={!canSubmit}
        >
          {canSubmit ? <EnterYesIcon width={34} height={34} /> : <EnterNoIcon width={34} height={34} />}
        </Pressable>
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    width: 358,
    position: 'relative',
  },
  attachmentMenuRow: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    gap: 12,
    zIndex: 3,
  },
  attachmentCard: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: colors.background.bg1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  attachmentCardText: {
    ...ts('body1'),
    color: colors.text.text3,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 14
  },
  imagePreviewRow: {
    position: 'absolute',
    left: 0,
    alignItems: 'flex-start',
    zIndex: 2,
  },
  imagePreviewCard: {
    width: 100,
    height: 100,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  removeImageButtonInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(23,25,26,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
    backgroundColor: colors.background.bg2,
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
