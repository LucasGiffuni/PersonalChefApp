import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/stores/authStore';
import { useConsumerStore } from '../../lib/stores/consumerStore';
import { lightTheme, useTheme } from '../../lib/theme';

function iosColor(name: string, fallback: string) {
  return Platform.OS === 'ios' ? PlatformColor(name) : fallback;
}

const HEADER_HEIGHT = 52;

export default function ConsumerProfileScreen() {
  const isDark = useColorScheme() === 'dark';
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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

  const linkedDate = useMemo(() => (linkedAt ? new Date(linkedAt).toLocaleDateString('es-UY') : '—'), [linkedAt]);

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
    <SafeAreaView style={[styles.safe, { backgroundColor: iosColor('systemGroupedBackground', colors.background) }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top }]}> 
        <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={styles.headerBlur}>
          <Text style={[styles.headerTitle, { color: iosColor('label', colors.label) }]}>Perfil</Text>
        </BlurView>
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + HEADER_HEIGHT + 12, paddingHorizontal: 16, paddingBottom: 132 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionLabel, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>MI PERFIL</Text>
        <View style={[styles.groupCard, { backgroundColor: iosColor('secondarySystemGroupedBackground', colors.card) }]}>
          <Pressable style={[styles.row, { borderBottomColor: iosColor('separator', '#C6C6C8') }]} onPress={() => setEditingName((v) => !v)}>
            <Text style={[styles.rowTitle, { color: iosColor('label', colors.label) }]}>Tu nombre</Text>
            <View style={styles.rowTrailing}>
              <Text style={[styles.rowValue, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>{displayName || 'Agregar'}</Text>
              <Ionicons name="chevron-forward" size={16} color={iosColor('tertiaryLabel', '#C7C7CC')} style={{ marginLeft: 4 }} />
            </View>
          </Pressable>

          {editingName ? (
            <View style={[styles.inlineEditor, { borderBottomColor: iosColor('separator', '#C6C6C8') }]}>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Tu nombre"
                placeholderTextColor={iosColor('tertiaryLabel', colors.secondaryLabel)}
                style={[styles.input, { color: iosColor('label', colors.label) }]}
              />
              <Pressable
                onPress={async () => {
                  await saveProfile(displayName, allergies);
                  setEditingName(false);
                }}
              >
                <Text style={styles.saveText}>Guardar</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.allergyBlock}>
            <Text style={[styles.rowTitle, { color: iosColor('label', colors.label) }]}>Alergias</Text>
            <View style={styles.allergyChipsWrap}>
              {allergies.length ? (
                allergies.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => void onRemoveAllergy(item)}
                    style={[styles.allergyChip, { backgroundColor: iosColor('tertiarySystemGroupedBackground', '#EFEFF4') }]}
                  >
                    <Text style={[styles.allergyChipText, { color: iosColor('label', colors.label) }]}>{item} ×</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={[styles.emptyInline, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>Sin alergias cargadas</Text>
              )}
            </View>
            <View style={styles.addAllergyRow}>
              <TextInput
                value={allergyInput}
                onChangeText={setAllergyInput}
                placeholder="Agregar alergia"
                placeholderTextColor={iosColor('tertiaryLabel', colors.secondaryLabel)}
                style={[styles.input, { color: iosColor('label', colors.label) }]}
              />
              <Pressable onPress={() => void onAddAllergy()}>
                <Text style={styles.saveText}>Agregar</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>MI CHEF</Text>
        <View style={[styles.groupCard, { backgroundColor: iosColor('secondarySystemGroupedBackground', colors.card) }]}>
          <View style={[styles.row, { borderBottomColor: iosColor('separator', '#C6C6C8') }]}>
            <Text style={[styles.rowTitle, { color: iosColor('label', colors.label) }]}>Chef</Text>
            <Text style={[styles.rowValue, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>{chefId ? `ID ${chefId.slice(0, 8)}` : 'Sin vincular'}</Text>
          </View>
          <View style={[styles.row, { borderBottomColor: iosColor('separator', '#C6C6C8') }]}>
            <Text style={[styles.rowTitle, { color: iosColor('label', colors.label) }]}>Vinculado desde</Text>
            <Text style={[styles.rowValue, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>{linkedDate}</Text>
          </View>
          <Pressable style={styles.row} onPress={onUnlink}>
            <Text style={[styles.rowTitle, { color: iosColor('systemRed', '#FF3B30') }]}>Desvincularme</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionLabel, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>CUENTA</Text>
        <View style={[styles.groupCard, { backgroundColor: iosColor('secondarySystemGroupedBackground', colors.card) }]}>
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
  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  headerBlur: {
    height: HEADER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: iosColor('separator', '#C6C6C8'),
  },
  headerTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  sectionLabel: { fontSize: 12, fontWeight: '700', marginTop: 18, marginBottom: 8, paddingHorizontal: 4 },
  groupCard: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: lightTheme.colors.label,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 4,
  },
  row: {
    minHeight: 54,
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
    minHeight: 54,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  input: { flex: 1, minHeight: 40, fontSize: 16 },
  saveText: { color: iosColor('systemBlue', '#007AFF'), fontWeight: '700', marginLeft: 10 },
  allergyBlock: { paddingHorizontal: 14, paddingVertical: 12 },
  allergyChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  allergyChip: { borderRadius: 16, paddingHorizontal: 10, minHeight: 30, justifyContent: 'center', marginRight: 8, marginBottom: 8 },
  allergyChipText: { fontSize: 13, fontWeight: '600' },
  emptyInline: { fontSize: 14, fontStyle: 'italic' },
  addAllergyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
});

