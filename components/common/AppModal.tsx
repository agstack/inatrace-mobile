import { Modal, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';

type AppModalProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  style?: object;
};

export default function AppModal({
  visible,
  onClose,
  children,
  style,
}: AppModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <View style={[styles.card, style]}>{children}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  card: {
    width: '90%',
    borderRadius: 8,
    padding: 20,
    backgroundColor: 'white',
  },
});
