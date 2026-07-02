// Patient 360 — Dependants Management Screen
import React, { useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TextInput,
  TouchableOpacity, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Spacing, Typography, Radius } from '../../../unihealth-shared/tokens';
import { SectionHeader, StatusBadge, PrimaryButton, Divider } from '../../../unihealth-shared/components';

const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Guardian dependent'] as const;

interface Dependant {
  id: string; name: string; relationship: string;
  dob: string; nationalId?: string; status: string;
}

const INITIAL: Dependant[] = [
  { id: 'D-1', name: 'John Wanjiku', relationship: 'Spouse', dob: '1982-07-12', nationalId: '22881234', status: 'active' },
  { id: 'D-2', name: 'Michael Wanjiku', relationship: 'Child', dob: '2010-03-05', status: 'active' },
  { id: 'D-3', name: 'Sarah Wanjiku', relationship: 'Child', dob: '2013-11-20', status: 'active' },
];

export default function DependantsScreen() {
  const [dependants, setDependants] = useState<Dependant[]>(INITIAL);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', relationship: RELATIONSHIPS[0], dob: '', nationalId: '' });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.dob.trim()) {
      Toast.show({ type: 'error', text1: 'Missing fields', text2: 'Name and date of birth are required.' });
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    const newDep: Dependant = {
      id: 'D-' + Date.now(), name: form.name,
      relationship: form.relationship, dob: form.dob,
      nationalId: form.nationalId || undefined, status: 'pending',
    };
    setDependants((prev) => [...prev, newDep]);
    setForm({ name: '', relationship: RELATIONSHIPS[0], dob: '', nationalId: '' });
    setShowAdd(false);
    setSaving(false);
    Toast.show({ type: 'success', text1: 'Dependant added', text2: `${newDep.name} added — pending SHA verification` });
  };

  const handleRemove = (dep: Dependant) => {
    Alert.alert(
      `Remove ${dep.name}?`,
      'This will remove them from your SHA household. Their coverage will end at the next billing cycle.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => {
          setDependants((prev) => prev.filter((d) => d.id !== dep.id));
          Toast.show({ type: 'info', text1: 'Dependant removed', text2: dep.name });
        }},
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <SectionHeader
          title="Manage Dependants"
          subtitle={`${dependants.length} / 5 dependants registered`}
        />

        {dependants.map((dep) => (
          <View key={dep.id} style={styles.depCard}>
            <View style={styles.depLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{dep.name[0]}</Text>
              </View>
              <View style={styles.depInfo}>
                <Text style={styles.depName}>{dep.name}</Text>
                <Text style={styles.depMeta}>{dep.relationship} · DOB {dep.dob}</Text>
                {dep.nationalId && <Text style={styles.depId}>ID: {dep.nationalId}</Text>}
              </View>
            </View>
            <View style={styles.depRight}>
              <StatusBadge status={dep.status} size="sm" />
              <TouchableOpacity
                onPress={() => handleRemove(dep)}
                style={styles.removeBtn}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${dep.name}`}
              >
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {dependants.length < 5 && (
          <PrimaryButton
            label="+ Add Dependant"
            onPress={() => setShowAdd(true)}
            variant="secondary"
          />
        )}

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            SHA allows a maximum of 5 registered dependants per household.
            Adding a dependant will trigger SHA verification — they will show as "Pending" until verified.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Dependant Modal */}
      <Modal
        visible={showAdd}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAdd(false)}
        accessibilityViewIsModal
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Dependant</Text>
            <Divider />

            <Field label="Full Name *" value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
              placeholder="As on National ID / birth certificate"
            />
            <Field label="Date of Birth *" value={form.dob}
              onChangeText={(t) => setForm({ ...form, dob: t })}
              placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation"
            />
            <Field label="National ID / Birth Cert (optional)" value={form.nationalId}
              onChangeText={(t) => setForm({ ...form, nationalId: t })}
              placeholder="Leave blank for minors without ID"
            />

            <Text style={styles.fieldLabel}>Relationship *</Text>
            <View style={styles.relationshipRow}>
              {RELATIONSHIPS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.relBtn, form.relationship === r && styles.relBtnActive]}
                  onPress={() => setForm({ ...form, relationship: r })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: form.relationship === r }}
                >
                  <Text style={[styles.relBtnText, form.relationship === r && styles.relBtnTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <PrimaryButton label="Cancel" variant="secondary" onPress={() => setShowAdd(false)} style={styles.modalBtn} />
              <PrimaryButton label={saving ? 'Saving…' : 'Add Dependant'} loading={saving} onPress={handleAdd} style={styles.modalBtn} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const Field = ({ label, value, onChangeText, placeholder, keyboardType }: any) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.textMuted}
      keyboardType={keyboardType ?? 'default'}
      accessibilityLabel={label}
    />
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPage },
  content: { padding: Spacing.lg, gap: Spacing.sm },
  depCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.md,
  },
  depLeft: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center', flex: 1 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.accentInsurance + '33', borderWidth: 1, borderColor: Colors.accentInsurance,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Colors.accentInsurance, fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightBold },
  depInfo: { flex: 1, gap: 2 },
  depName: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
  depMeta: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  depId: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  depRight: { alignItems: 'flex-end', gap: Spacing.xs },
  removeBtn: { paddingVertical: 4 },
  removeText: { color: Colors.statusDanger, fontSize: Typography.fontSizeXs },
  noteBox: {
    backgroundColor: Colors.bgSurfaceRaised, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
  },
  noteText: { color: Colors.textMuted, fontSize: Typography.fontSizeXs, lineHeight: 18 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.bgSurface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: Spacing.xl, gap: Spacing.md, maxHeight: '85%',
  },
  modalTitle: { color: Colors.textPrimary, fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold },
  field: { gap: Spacing.xs },
  fieldLabel: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },
  input: {
    backgroundColor: Colors.bgSurfaceRaised, borderRadius: Radius.sm, borderWidth: 1,
    borderColor: Colors.border, color: Colors.textPrimary, fontSize: Typography.fontSizeMd,
    paddingHorizontal: Spacing.md, height: 44,
  },
  relationshipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  relBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgSurfaceRaised,
  },
  relBtnActive: { borderColor: Colors.accentInsurance, backgroundColor: Colors.accentInsurance + '22' },
  relBtnText: { color: Colors.textMuted, fontSize: Typography.fontSizeSm },
  relBtnTextActive: { color: Colors.accentInsurance, fontWeight: Typography.fontWeightMedium },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  modalBtn: { flex: 1 },
});
