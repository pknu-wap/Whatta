import React from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native'

import CameraIcon from '@/assets/icons/camera.svg'
import PicIcon from '@/assets/icons/pic.svg'

import * as ImagePicker from 'expo-image-picker'

interface Props {
  visible: boolean
  onClose: () => void
  onTakePhoto?: (uri: string) => void
  onPickImage?: (uri: string) => void
}

export default function AddImageSheet({
  visible,
  onClose,
  onTakePhoto,
  onPickImage,
}: Props) {

  // 📸 촬영하기
  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      alert('카메라 권한이 필요합니다!')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    })

    if (!result.canceled) {
      const uri = result.assets[0].uri
      onTakePhoto?.(uri)
    }
  }

  // 🖼 갤러리에서 선택
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      alert('사진 접근 권한이 필요합니다!')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    })

    if (!result.canceled) {
      const uri = result.assets[0].uri
      onPickImage?.(uri)
    }
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Dim */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.dim} />
      </TouchableWithoutFeedback>

      {/* Bottom Sheet */}
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <Text style={styles.title}>이미지로 추가</Text>

        {/* 촬영하기 */}
        <Pressable
          style={styles.itemRow}
          onPress={() => {
            handleTakePhoto()
            onClose()
          }}
        >
          <CameraIcon width={24} height={24} style={styles.icon} />
          <Text style={styles.label}>촬영하기</Text>
        </Pressable>

        {/* 사진 불러오기 */}
        <Pressable
          style={styles.itemRow}
          onPress={() => {
            handlePickImage()
            onClose()
          }}
        >
          <PicIcon width={24} height={24} style={styles.icon} />
          <Text style={styles.label}>사진 불러오기</Text>
        </Pressable>

        {/* 하단 여백 */}
        <View style={{ height: 24 }} />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  dim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '26%',
    backgroundColor: 'white',
    paddingTop: 17,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    shadowColor: '#00000040',
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CFCFCF',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 25,
    letterSpacing: -0.45,
    color: '#000',
    marginLeft: 38,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingLeft: 20,
  },
  icon: {
    marginRight: 20,
    marginLeft: 16,
  },
  label: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
    lineHeight: 25,
    letterSpacing: -0.45,
  },
})