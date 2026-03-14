import React from 'react'
import { View, TextInput, Pressable, Text, StyleSheet } from 'react-native'

import colors from '@/styles/colors'
import { ts } from '@/styles/typography'

type CreateType = 'event' | 'task'

type CreateModeTypeStepProps = {
  title: string
  onChangeTitle: (value: string) => void
  onFocusTitle?: () => void
  onSubmitTitle?: () => void
  autoFocusTitle?: boolean
  showOptions?: boolean
  colors: readonly string[]
  selectedColorIndex: number
  onSelectColorIndex: (index: number) => void
  selectedType: CreateType | null
  onSelectType: (value: CreateType) => void
}

export default function CreateModeTypeStep({
  title,
  onChangeTitle,
  onFocusTitle,
  onSubmitTitle,
  autoFocusTitle = false,
  showOptions = true,
  colors: paletteColors,
  selectedColorIndex,
  onSelectColorIndex,
  selectedType,
  onSelectType,
}: CreateModeTypeStepProps) {
  const [colorPaletteOpen, setColorPaletteOpen] = React.useState(false)

  React.useEffect(() => {
    if (selectedType === 'task') setColorPaletteOpen(false)
  }, [selectedType])

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <TextInput
          value={title}
          onChangeText={onChangeTitle}
          onFocus={onFocusTitle}
          onSubmitEditing={onSubmitTitle}
          autoFocus={autoFocusTitle}
          returnKeyType="done"
          placeholder="제목을 입력하세요..."
          placeholderTextColor={colors.text.text4}
          style={styles.titleInput}
        />
        {showOptions && selectedType === 'event' && (
          <Pressable
            style={[
              styles.titleColorChip,
              { backgroundColor: paletteColors[selectedColorIndex] ?? paletteColors[0] },
            ]}
            onPress={() => setColorPaletteOpen((v) => !v)}
          />
        )}
      </View>

      {showOptions && selectedType === 'event' && colorPaletteOpen && (
        <View style={styles.colorPaletteBox}>
          <View style={styles.colorPaletteGrid}>
            {paletteColors.slice(0, 12).map((c, idx) => (
              <Pressable
                key={`C${String(idx).padStart(2, '0')}`}
                style={[styles.colorPaletteChip, { backgroundColor: c }]}
                onPress={() => {
                  onSelectColorIndex(idx)
                }}
              />
            ))}
          </View>
        </View>
      )}

      {showOptions && (
        <>
          <View style={styles.divider} />

          <View style={styles.typeRow}>
            <Pressable
              style={[styles.typeButton, selectedType === 'event' && styles.typeButtonSelected]}
              onPress={() => onSelectType('event')}
            >
              <Text style={[styles.typeText, selectedType === 'event' && styles.typeTextSelected]}>
                일정
              </Text>
            </Pressable>

            <Pressable
              style={[styles.typeButton, selectedType === 'task' && styles.typeButtonSelected]}
              onPress={() => onSelectType('task')}
            >
              <Text style={[styles.typeText, selectedType === 'task' && styles.typeTextSelected]}>
                할 일
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    paddingHorizontal: 24,
    position: 'relative',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleInput: {
    ...ts('label1'),
    color: colors.text.text1,
    minHeight: 24,
    flex: 1,
    marginRight: 12,
  },
  titleColorChip: {
    width: 24,
    height: 24,
    borderRadius: 8,
  },
  colorPaletteBox: {
    width: 320,
    height: 136,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: 42, // 팔레트 높이
    left: 15,
    zIndex: 30,
    shadowColor: '#A4ADB2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 8,
    justifyContent: 'center',
  },
  colorPaletteGrid: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorPaletteChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  divider: {
    marginTop: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider.divider1,
  },
  typeRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeButton: {
    width: 143,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider.divider1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.bg1,
  },
  typeButtonSelected: {
    backgroundColor: colors.icon.selected,
  },
  typeText: {
    ...ts('body1'),
    color: colors.text.text3,
  },
  typeTextSelected: {
    color: colors.text.text1w,
    fontWeight: '700',
  },
})
