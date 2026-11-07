import React, { Component, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  View,
  type ScrollViewProps,
  type ViewProps,
} from 'react-native';
import { X } from 'lucide-react-native';
import AppModal from './AppModal';
import Colors from '@/constants/Colors';

// @gorhom/bottom-sheet 5.x does not animate with Reanimated 4.4+ on the
// New Architecture. Keep the selector surface on the native Modal API.

type BottomSheetModalProps = {
  children?: ReactNode;
  snapPoints?: Array<string | number>;
  backdropComponent?: (props: any) => ReactNode;
  [key: string]: unknown;
};

function resolveHeight(snapPoints?: Array<string | number>) {
  const first = snapPoints?.[0];
  if (typeof first === 'number') return first;
  if (typeof first === 'string') return first;
  return '70%';
}

export class BottomSheetModal extends Component<
  BottomSheetModalProps,
  { visible: boolean }
> {
  state = { visible: false };

  present = () => this.setState({ visible: true });

  close = () => this.setState({ visible: false });

  render() {
    const { children, snapPoints } = this.props;
    return (
      <AppModal
        visible={this.state.visible}
        onClose={this.close}
        style={{ height: resolveHeight(snapPoints), padding: 0 }}
      >
        <View style={{ flex: 1, padding: 20 }}>
          <View style={{ alignItems: 'flex-end' }}>
            <Pressable onPress={this.close} hitSlop={12}>
              <X size={20} color={Colors.black} />
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>{children}</View>
        </View>
      </AppModal>
    );
  }
}

export function BottomSheetScrollView(props: ScrollViewProps) {
  return (
    <ScrollView
      {...props}
      style={[{ flex: 1 }, props.style]}
      keyboardShouldPersistTaps="handled"
    />
  );
}

export function BottomSheetView(props: ViewProps) {
  return <View {...props} />;
}

export function BottomSheetBackdrop() {
  return null;
}

export function BottomSheetModalProvider({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
