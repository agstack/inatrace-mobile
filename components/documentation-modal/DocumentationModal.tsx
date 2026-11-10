import { View, Text, Pressable, Linking } from 'react-native';
import { X } from 'lucide-react-native';
import i18n from '@/locales/i18n';
import AppModal from '@/components/common/AppModal';
import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import Colors from '@/constants/Colors';

export default function DocumentationModal() {
  const { documentationModal, setDocumentationModal } = useContext(AuthContext);

  const clickDocumentation = async () => {
    const url = process.env.EXPO_PUBLIC_DOCUMENTATION_URI ?? '';
    const canOpen = await Linking.canOpenURL(url);

    if (canOpen) {
      Linking.openURL(url);
    } else {
      console.error('Cannot open URL:', url);
    }
  };

  return (
    <>
      {documentationModal && (
        <AppModal
          visible={documentationModal}
          onClose={() => setDocumentationModal(false)}
          style={{
            height: 160,
            justifyContent: 'space-between',
          }}
        >
          <View>
            <View className="flex flex-row justify-between items-center mb-2">
              <Text className="text-[18px] font-medium">
                {i18n.t('documentation.title')}
              </Text>
              <Pressable
                onPress={() => setDocumentationModal(false)}
                className=""
              >
                <X size={20} color={Colors.black} />
              </Pressable>
            </View>
            <Text className="text-[14px] text-black/70">
              {i18n.t('documentation.description')}
            </Text>

            <Pressable
              onPress={clickDocumentation}
              className="py-2 mt-4 rounded-md bg-Orange"
            >
              <Text className="text-center text-white">
                {i18n.t('documentation.documentation')}
              </Text>
            </Pressable>
          </View>
        </AppModal>
      )}
    </>
  );
}
