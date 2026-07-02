// Patient 360 — Document Upload Screen
import React, { useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius } from '../../../unihealth-shared/tokens';
import { SectionHeader, PrimaryButton, Divider, StatusBadge } from '../../../unihealth-shared/components';

interface UploadedDoc {
  id: string; name: string; type: string;
  size: string; status: 'uploaded' | 'pending' | 'error';
  uploadedAt: string;
}

const INITIAL_DOCS: UploadedDoc[] = [
  { id: 'DOC-1', name: 'Disability_Certificate_2024.pdf', type: 'Disability Certificate', size: '1.2 MB', status: 'uploaded', uploadedAt: '2024-03-01' },
  { id: 'DOC-2', name: 'NationalID_Front.jpg', type: 'National ID', size: '340 KB', status: 'uploaded', uploadedAt: '2024-01-15' },
];

const DOC_TYPES = [
  'National ID', 'Passport', 'Birth Certificate', 'Disability Certificate',
  'Medical Referral Letter', 'Lab Result', 'Claim Supporting Document', 'Other',
];

export default function DocumentUploadScreen() {
  const [docs, setDocs] = useState<UploadedDoc[]>(INITIAL_DOCS);
  const [selectedType, setSelectedType] = useState(DOC_TYPES[0]);
  const [uploading, setUploading] = useState(false);

  const handlePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const sizeKb = Math.round((asset.size ?? 0) / 1024);
      const sizeDisplay = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

      // Validate: max 10 MB
      if ((asset.size ?? 0) > 10 * 1024 * 1024) {
        Toast.show({ type: 'error', text1: 'File too large', text2: 'Maximum file size is 10 MB.' });
        return;
      }

      setUploading(true);
      // In production: POST to /insurance/documents with FormData
      await new Promise((r) => setTimeout(r, 1200));

      const newDoc: UploadedDoc = {
        id: 'DOC-' + Date.now(),
        name: asset.name,
        type: selectedType,
        size: sizeDisplay,
        status: 'uploaded',
        uploadedAt: new Date().toISOString().split('T')[0],
      };
      setDocs((prev) => [newDoc, ...prev]);
      setUploading(false);
      Toast.show({ type: 'success', text1: 'Document uploaded', text2: asset.name });
    } catch (e) {
      setUploading(false);
      Toast.show({ type: 'error', text1: 'Upload failed', text2: 'Please try again.' });
    }
  };

  const handleDelete = (doc: UploadedDoc) => {
    Alert.alert(
      `Delete ${doc.name}?`,
      'This document will be permanently removed from your health record.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          setDocs((prev) => prev.filter((d) => d.id !== doc.id));
          Toast.show({ type: 'info', text1: 'Document deleted' });
        }},
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <SectionHeader
          title="My Documents"
          subtitle="Supporting documents for claims, SHA verification, and referrals."
        />

        {/* Upload Card */}
        <View style={styles.uploadCard}>
          <Text style={styles.uploadCardTitle}>Upload a Document</Text>

          {/* Type Selector */}
          <Text style={styles.fieldLabel}>Document Type</Text>
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeRow}
          >
            {DOC_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, selectedType === t && styles.typeBtnActive]}
                onPress={() => setSelectedType(t)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedType === t }}
              >
                <Text style={[styles.typeBtnText, selectedType === t && styles.typeBtnTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.dropzone}
            onPress={handlePick}
            accessibilityRole="button"
            accessibilityLabel="Select file to upload"
          >
            <Ionicons name="cloud-upload-outline" size={36} color={Colors.accentInsurance} />
            <Text style={styles.dropzoneTitle}>Tap to select file</Text>
            <Text style={styles.dropzoneSub}>PDF, JPG, PNG · Max 10 MB</Text>
          </TouchableOpacity>

          <PrimaryButton
            label={uploading ? 'Uploading…' : 'Select & Upload File'}
            onPress={handlePick}
            loading={uploading}
          />
        </View>

        <Divider />

        {/* Uploaded Documents */}
        <SectionHeader title="Uploaded Documents" subtitle={`${docs.length} files`} />
        {docs.length === 0 ? (
          <View style={styles.emptyDocs}>
            <Text style={styles.emptyDocsIcon}>📂</Text>
            <Text style={styles.emptyDocsText}>No documents uploaded yet</Text>
          </View>
        ) : (
          docs.map((doc) => (
            <View key={doc.id} style={styles.docRow}>
              <View style={styles.docIcon}>
                <Ionicons
                  name={doc.name.endsWith('.pdf') ? 'document-outline' : 'image-outline'}
                  size={24} color={Colors.accentInsurance}
                />
              </View>
              <View style={styles.docInfo}>
                <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                <Text style={styles.docMeta}>{doc.type} · {doc.size} · {doc.uploadedAt}</Text>
                <StatusBadge status={doc.status} size="sm" />
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(doc)}
                style={styles.deleteBtn}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${doc.name}`}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.statusDanger} />
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={styles.privacyNote}>
          <Text style={styles.privacyText}>
            🔒 Documents are encrypted at rest and only shared with healthcare providers
            and SHA/insurers with your consent. Retained for 20 years per the Digital Health Act 2023.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPage },
  content: { padding: Spacing.lg, gap: Spacing.sm },
  uploadCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md,
  },
  uploadCardTitle: { color: Colors.textPrimary, fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemiBold },
  fieldLabel: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },
  typeRow: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  typeBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.bgSurfaceRaised,
  },
  typeBtnActive: { borderColor: Colors.accentInsurance, backgroundColor: Colors.accentInsurance + '22' },
  typeBtnText: { color: Colors.textMuted, fontSize: Typography.fontSizeSm, whiteSpace: 'nowrap' } as any,
  typeBtnTextActive: { color: Colors.accentInsurance, fontWeight: Typography.fontWeightMedium },
  dropzone: {
    borderWidth: 2, borderColor: Colors.accentInsurance + '55', borderStyle: 'dashed',
    borderRadius: Radius.md, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.accentInsurance + '08',
  },
  dropzoneTitle: { color: Colors.textPrimary, fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightMedium },
  dropzoneSub: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  emptyDocs: { alignItems: 'center', padding: Spacing.section, gap: Spacing.sm },
  emptyDocsIcon: { fontSize: 40 },
  emptyDocsText: { color: Colors.textMuted, fontSize: Typography.fontSizeSm },
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.md,
  },
  docIcon: {
    width: 40, height: 40, borderRadius: Radius.sm,
    backgroundColor: Colors.accentInsurance + '1A',
    alignItems: 'center', justifyContent: 'center',
  },
  docInfo: { flex: 1, gap: 4 },
  docName: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
  docMeta: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  deleteBtn: { padding: Spacing.xs },
  privacyNote: {
    backgroundColor: Colors.bgSurfaceRaised, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
  },
  privacyText: { color: Colors.textMuted, fontSize: Typography.fontSizeXs, lineHeight: 18 },
});
