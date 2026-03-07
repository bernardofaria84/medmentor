import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Share,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '../services/api';
import { useAppTheme } from '../contexts/ThemeContext';
import { useBookmarks } from '../hooks/useBookmarks';

export type FeedbackState = 'LIKE' | 'DISLIKE' | 'NONE';

interface Props {
  messageId: string;
  content: string;
  mentorName: string;
  conversationId: string;
  initialFeedback?: FeedbackState;
}

export const MessageActionBar = ({ messageId, content, mentorName, conversationId, initialFeedback = 'NONE' }: Props) => {
  const [feedback, setFeedback] = useState<FeedbackState>(initialFeedback);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const { colors } = useAppTheme();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const bookmarked = isBookmarked(messageId);

  const handleFeedback = async (type: 'LIKE' | 'DISLIKE') => {
    const newFeedback = feedback === type ? 'NONE' : type;
    setFeedback(newFeedback);
    Haptics.impactAsync(
      type === 'LIKE' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );
    try {
      await api.post(`/api/messages/${messageId}/feedback`, { feedback: newFeedback });
    } catch (e) {
      // silent — UI already updated
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Platform.OS !== 'web') Alert.alert('Copiado!', 'Texto copiado para a área de transferência.');
  };

  const handleShareText = async () => {
    setShareMenuOpen(false);
    Haptics.selectionAsync();
    const msg = `*${mentorName} via MedMentor*\n\n${content.substring(0, 1000)}`;
    try {
      await Share.share({ message: msg, title: 'Resposta do MedMentor' });
    } catch (e) {}
  };

  const handleSharePDF = async () => {
    setShareMenuOpen(false);
    Haptics.selectionAsync();
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;color:#14213D;line-height:1.6;}
h1{color:#0D7377;border-bottom:2px solid #0D7377;padding-bottom:8px;}
.footer{margin-top:40px;padding-top:12px;border-top:1px solid #e5e7eb;color:#6B7280;font-size:12px;}</style></head>
<body><h1>${mentorName}</h1><div>${content.replace(/\n/g, '<br/>')}</div>
<div class="footer">MedMentor — ${new Date().toLocaleDateString('pt-BR')}</div></body></html>`;
    if (Platform.OS === 'web') {
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); w.print(); }
    } else {
      try {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
        }
      } catch (e) {}
    }
  };

  const handleBookmark = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleBookmark({ messageId, content, mentorName, conversationId });
  };

  return (
    <View style={styles.row}>
      {/* Like */}
      <TouchableOpacity
        onPress={() => handleFeedback('LIKE')}
        style={[styles.btn, feedback === 'LIKE' && { backgroundColor: '#DCFCE7' }]}
        data-testid={`like-btn-${messageId}`}
      >
        <MaterialCommunityIcons
          name={feedback === 'LIKE' ? 'thumb-up' : 'thumb-up-outline'}
          size={15}
          color={feedback === 'LIKE' ? '#16A34A' : colors.textTertiary}
        />
      </TouchableOpacity>

      {/* Dislike */}
      <TouchableOpacity
        onPress={() => handleFeedback('DISLIKE')}
        style={[styles.btn, feedback === 'DISLIKE' && { backgroundColor: '#FEE2E2' }]}
        data-testid={`dislike-btn-${messageId}`}
      >
        <MaterialCommunityIcons
          name={feedback === 'DISLIKE' ? 'thumb-down' : 'thumb-down-outline'}
          size={15}
          color={feedback === 'DISLIKE' ? '#DC2626' : colors.textTertiary}
        />
      </TouchableOpacity>

      {/* Copy */}
      <TouchableOpacity onPress={handleCopy} style={styles.btn} data-testid={`copy-btn-${messageId}`}>
        <MaterialCommunityIcons name="content-copy" size={15} color={colors.textTertiary} />
      </TouchableOpacity>

      {/* Share */}
      <TouchableOpacity onPress={() => setShareMenuOpen(true)} style={styles.btn} data-testid={`share-btn-${messageId}`}>
        <MaterialCommunityIcons name="share-variant-outline" size={15} color={colors.textTertiary} />
      </TouchableOpacity>

      {/* Bookmark */}
      <TouchableOpacity onPress={handleBookmark} style={styles.btn} data-testid={`bookmark-btn-${messageId}`}>
        <MaterialCommunityIcons
          name={bookmarked ? 'bookmark' : 'bookmark-outline'}
          size={15}
          color={bookmarked ? '#F59E0B' : colors.textTertiary}
        />
      </TouchableOpacity>

      {/* Share Menu Modal */}
      <Modal visible={shareMenuOpen} transparent animationType="fade" onRequestClose={() => setShareMenuOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShareMenuOpen(false)} activeOpacity={1}>
          <View style={[styles.shareMenu, { backgroundColor: colors.surface }]}>
            <Text style={[styles.shareTitle, { color: colors.text }]}>Compartilhar resposta</Text>
            <TouchableOpacity style={styles.shareOption} onPress={handleShareText}>
              <MaterialCommunityIcons name="whatsapp" size={22} color="#25D366" />
              <Text style={[styles.shareOptionText, { color: colors.text }]}>Texto / WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareOption} onPress={handleSharePDF}>
              <MaterialCommunityIcons name="file-pdf-box" size={22} color="#EF4444" />
              <Text style={[styles.shareOptionText, { color: colors.text }]}>Exportar PDF</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginTop: 8, gap: 4 },
  btn: { padding: 6, borderRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  shareMenu: { borderRadius: 16, padding: 20, minWidth: 260, elevation: 8 },
  shareTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, marginBottom: 16 },
  shareOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 14 },
  shareOptionText: { fontFamily: 'Inter_400Regular', fontSize: 15 },
});
