import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  PlatformColor,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/stores/authStore';
import { useConsumerStore } from '../../lib/stores/consumerStore';

function iosColor(name: string, fallback: string) {
  return Platform.OS === 'ios' ? PlatformColor(name) : fallback;
}

export default function ConsumerProfileScreen() {
  const isDark = useColorScheme() === 'dark';
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const clearConsumerStore = useConsumerStore((s) => s.clear);
  const chefId = useConsumerStore((s) => s.chefId);
  const linkedAt = useConsumerStore((s) => s.linkedAt);

  const [displayName, setDisplayName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const userId = session?.user?.id;
      if (!userId) return;

      const { data } = await supabase
        .from('consumer_profiles')
        .select('display_name,allergies')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        setDisplayName(data.display_name ?? '');
        setAllergies(Array.isArray(data.allergies) ? data.allergies : []);
      }
    };

    void loadProfile();
  }, [session?.user?.id]);

  const saveProfile = async (nextName: string, nextAllergies: string[]) => {
    const userId = session?.user?.id;
    if (!userId) return;
    await supabase.from('consumer_profiles').upsert(
      {
        user_id: userId,
        display_name: nextName.trim() || null,
        allergies: nextAllergies,
      },
      { onConflict: 'user_id' }
    );
  };

  const onAddAllergy = async () => {
    const value = allergyInput.trim();
    if (!value) return;
    const next = Array.from(new Set([...allergies, value]));
    setAllergies(next);
    setAllergyInput('');
    await saveProfile(displayName, next);
  };

  const onRemoveAllergy = async (value: string) => {
    const next = allergies.filter((item) => item !== value);
    setAllergies(next);
    await saveProfile(displayName, next);
  };

  const onUnlink = () => {
    Alert.alert('Desvincularme', '¿Querés desvincularte de tu chef actual?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desvincular',
        style: 'destructive',
        onPress: async () => {
          const userId = session?.user?.id;
          if (!userId) return;
          await supabase.from('chef_consumers').delete().eq('consumer_id', userId);
          clearConsumerStore();
        },
      },
    ]);
  };

  const onSignOut = async () => {
    await signOut();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: iosColor('systemGroupedBackground', isDark ? '#000' : '#F2F2F7') }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.screenTitle, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>Perfil</Text>

        <Text style={[styles.sectionLabel, { color: iosColor('secondaryLabel', '#8E8E93') }]}>MI PERFIL</Text>
        <View style={[styles.group, { backgroundColor: iosColor('secondarySystemGroupedBackground', isDark ? '#1C1C1E' : '#FFF') }]}>
          <Pressable style={[styles.row, { borderBottomColor: iosColor('separator', '#C6C6C8') }]} onPress={() => setEditingName((v) => !v)}>
            <Text style={[styles.rowTitle, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>Tu nombre</Text>
            <View style={styles.rowTrailing}>
              <Text style={[styles.rowValue, { color: iosColor('secondaryLabel', '#8E8E93') }]}>{displayName || 'Agregar'}</Text>
              <Ionicons name="chevron-forward" size={16} color={iosColor('tertiaryLabel', '#C7C7CC')} style={{ marginLeft: 4 }} />
            </View>
          </Pressable>

          {editingName ? (
            <View style={[styles.inlineEditor, { borderBottomColor: iosColor('separator', '#C6C6C8') }]}>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Tu nombre"
                placeholderTextColor={iosColor('tertiaryLabel', '#8E8E93')}
                style={[styles.input, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}
              />
              <Pressable
                onPress={async () => {
                  await saveProfile(displayName, allergies);
                  setEditingName(false);
                }}
              >
                <Text style={{ color: iosColor('systemBlue', '#007AFF'), fontWeight: '600' }}>Guardar</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.allergyBlock}>
            <Text style={[styles.rowTitle, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>Alergias</Text>
            <View style={styles.allergyChipsWrap}>
              {allergies.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => void onRemoveAllergy(item)}
                  style={[styles.allergyChip, { backgroundColor: iosColor('tertiarySystemBackground', '#EFEFF4') }]}
                >
                  <Text style={[styles.allergyChipText, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>{item} ×</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.addAllergyRow}>
              <TextInput
                value={allergyInput}
                onChangeText={setAllergyInput}
                placeholder="Agregar alergia"
                placeholderTextColor={iosColor('tertiaryLabel', '#8E8E93')}
                style={[styles.input, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}
              />
              <Pressable onPress={() => void onAddAllergy()}>
                <Text style={{ color: iosColor('systemBlue', '#007AFF'), fontWeight: '600', marginLeft: 10 }}>Agregar</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: iosColor('secondaryLabel', '#8E8E93') }]}>MI CHEF</Text>
        <View style={[styles.group, { backgroundColor: iosColor('secondarySystemGroupedBackground', isDark ? '#1C1C1E' : '#FFF') }]}>
          <View style={[styles.row, { borderBottomColor: iosColor('separator', '#C6C6C8') }]}>
            <Text style={[styles.rowTitle, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>Chef</Text>
            <Text style={[styles.rowValue, { color: iosColor('secondaryLabel', '#8E8E93') }]}>
              {chefId ? `ID ${chefId.slice(0, 8)}` : 'Sin vincular'}
            </Text>
          </View>
          <View style={[styles.row, { borderBottomColor: iosColor('separator', '#C6C6C8') }]}>
            <Text style={[styles.rowTitle, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>Vinculado desde</Text>
            <Text style={[styles.rowValue, { color: iosColor('secondaryLabel', '#8E8E93') }]}>
              {linkedAt ? new Date(linkedAt).toLocaleDateString('es-UY') : '—'}
            </Text>
          </View>
          <Pressable style={styles.row} onPress={onUnlink}>
            <Text style={[styles.rowTitle, { color: iosColor('systemRed', '#FF3B30') }]}>Desvincularme</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionLabel, { color: iosColor('secondaryLabel', '#8E8E93') }]}>CUENTA</Text>
        <View style={[styles.group, { backgroundColor: iosColor('secondarySystemGroupedBackground', isDark ? '#1C1C1E' : '#FFF') }]}>
          <Pressable style={styles.row} onPress={onSignOut}>
            <Text style={[styles.rowTitle, { color: iosColor('systemRed', '#FF3B30') }]}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 120 },
  screenTitle: { fontSize: 34, fontWeight: '700', marginTop: 8, marginBottom: 14 },
  sectionLabel: { fontSize: 12, fontWeight: '600', marginTop: 16, marginBottom: 6, paddingHorizontal: 4 },
  group: { borderRadius: 12, overflow: 'hidden' },
  row: {
    minHeight: 52,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { fontSize: 16, fontWeight: '500' },
  rowValue: { fontSize: 15 },
  rowTrailing: { flexDirection: 'row', alignItems: 'center' },
  inlineEditor: {
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  input: { flex: 1, minHeight: 38, fontSize: 16 },
  allergyBlock: { paddingHorizontal: 14, paddingVertical: 12 },
  allergyChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  allergyChip: { borderRadius: 16, paddingHorizontal: 10, minHeight: 28, justifyContent: 'center', marginRight: 8, marginBottom: 8 },
  allergyChipText: { fontSize: 13, fontWeight: '600' },
  addAllergyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
});
