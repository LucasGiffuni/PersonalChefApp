import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Modal,
  Platform,
  PlatformColor,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useInviteStore } from '../../lib/stores/inviteStore';
import { PlanItemWithRecipe, startOfWeekMonday, toISODate } from '../../lib/stores/consumerStore';
import { ConsumerWithProfile, useChefDashboardStore } from '../../lib/stores/chefDashboardStore';
import { supabase } from '../../lib/supabase';

function iosColor(name: string, fallback: string) {
  return Platform.OS === 'ios' ? PlatformColor(name) : fallback;
}

const dayNames: Record<string, string> = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
  sun: 'Domingo',
};

function statusForCode(code: { max_uses: number; uses_count: number; expires_at: string | null }) {
  if (code.expires_at && new Date(code.expires_at).getTime() <= Date.now()) {
    return { label: 'Expirado', colorName: 'systemRed', fallback: '#FF3B30', bg: 'rgba(255,59,48,0.15)' };
  }
  if (code.uses_count >= code.max_uses) {
    return { label: 'Agotado', colorName: 'systemOrange', fallback: '#FF9500', bg: 'rgba(255,149,0,0.15)' };
  }
  return { label: 'Activo', colorName: 'systemGreen', fallback: '#34C759', bg: 'rgba(52,199,89,0.15)' };
}

export default function ChefInviteScreen() {
  const isDark = false;
  const { codes, fetchCodes, createCode, deleteCode } = useInviteStore();
  const consumers = useChefDashboardStore((s) => s.consumers);
  const fetchConsumers = useChefDashboardStore((s) => s.fetchConsumers);

  const [selectedConsumer, setSelectedConsumer] = useState<ConsumerWithProfile | null>(null);
  const [consumerItems, setConsumerItems] = useState<PlanItemWithRecipe[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingUses, setPendingUses] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        await fetchConsumers();
        await fetchCodes();
      };
      void run();
    }, [fetchCodes, fetchConsumers])
  );

  const sortedCodes = useMemo(() => {
    return [...codes].sort((a, b) => b.id - a.id);
  }, [codes]);

  const openConsumerSheet = async (consumer: ConsumerWithProfile) => {
    setSelectedConsumer(consumer);
    const weekStart = toISODate(startOfWeekMonday(new Date()));
    const { data: plan } = await supabase
      .from('weekly_plans')
      .select('id')
      .eq('consumer_id', consumer.consumerId)
      .eq('week_start', weekStart)
      .maybeSingle();

    if (!plan?.id) {
      setConsumerItems([]);
      return;
    }

    const { data: items } = await supabase
      .from('plan_items')
      .select(
        'id,plan_id,recipe_id,servings,days,notes,created_at,recipes(id,name,cat,emoji,photo_url,time,difficulty,ingredients,steps,is_published)'
      )
      .eq('plan_id', plan.id)
      .order('created_at', { ascending: true });

    const normalized: PlanItemWithRecipe[] = (items ?? []).map((item: any) => ({
      id: item.id,
      plan_id: item.plan_id,
      recipe_id: item.recipe_id,
      servings: item.servings ?? 1,
      days: Array.isArray(item.days) ? item.days : [],
      notes: item.notes ?? null,
      created_at: item.created_at,
      recipe: item.recipes ?? null,
    }));
    setConsumerItems(normalized);
  };

  const createAndShare = async (maxUses: number, expiresAt: Date | null) => {
    try {
      const created = await createCode(maxUses, expiresAt ?? undefined);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const message = `Te invito a ver mi menú en ChefApp. Usá este código: ${created.code}`;
      Alert.alert('Código generado', created.code, [
        {
          text: 'Copiar',
          onPress: async () => {
            await Clipboard.setStringAsync(created.code);
          },
        },
        {
          text: 'Compartir',
          onPress: async () => {
            await Share.share({
              message,
              url: `chefapp://invite/${created.code}`,
            });
          },
        },
        { text: 'Cerrar', style: 'cancel' },
      ]);
    } catch (error: any) {
      Alert.alert('No se pudo generar', error?.message ?? 'Error inesperado');
    }
  };

  const openGenerateSheet = () => {
    if (Platform.OS !== 'ios') {
      void createAndShare(1, null);
      return;
    }

    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Usos del código',
        options: ['Cancelar', '1 uso', '3 usos', '5 usos', 'Sin límite'],
        cancelButtonIndex: 0,
      },
      (usesIndex) => {
        if (!usesIndex) return;
        const uses = usesIndex === 1 ? 1 : usesIndex === 2 ? 3 : usesIndex === 3 ? 5 : 9999;

        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: 'Expiración',
            options: ['Cancelar', 'Sin expiración', '7 días', '30 días', 'Elegir fecha'],
            cancelButtonIndex: 0,
          },
          (expIndex) => {
            if (!expIndex) return;
            if (expIndex === 1) {
              void createAndShare(uses, null);
              return;
            }
            if (expIndex === 2) {
              const date = new Date();
              date.setDate(date.getDate() + 7);
              void createAndShare(uses, date);
              return;
            }
            if (expIndex === 3) {
              const date = new Date();
              date.setDate(date.getDate() + 30);
              void createAndShare(uses, date);
              return;
            }
            setPendingUses(uses);
            setShowDatePicker(true);
          }
        );
      }
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: iosColor('systemGroupedBackground', isDark ? '#000' : '#F2F2F7') }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>Invitaciones</Text>

        <Text style={[styles.sectionLabel, { color: iosColor('secondaryLabel', '#8E8E93') }]}>CONSUMIDORES VINCULADOS</Text>
        <View style={[styles.group, { backgroundColor: iosColor('secondarySystemGroupedBackground', '#FFF') }]}>
          {consumers.map((consumer, idx) => (
            <Pressable
              key={consumer.consumerId}
              onPress={() => void openConsumerSheet(consumer)}
              style={[styles.row, idx < consumers.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: iosColor('separator', '#C6C6C8') } : null]}
            >
              <View style={[styles.avatar, { backgroundColor: 'rgba(0,122,255,0.15)' }]}>
                <Text style={[styles.avatarText, { color: iosColor('systemBlue', '#007AFF') }]}>
                  {consumer.displayName.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>{consumer.displayName}</Text>
                <Text style={[styles.rowSubtitle, { color: iosColor('secondaryLabel', '#8E8E93') }]}>
                  Vinculado {consumer.linkedAt ? new Date(consumer.linkedAt).toLocaleDateString('es-UY') : '—'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={iosColor('tertiaryLabel', '#C7C7CC')} />
            </Pressable>
          ))}
          {!consumers.length ? (
            <View style={styles.emptyBlock}>
              <Ionicons name="person-add-outline" size={26} color={iosColor('secondaryLabel', '#8E8E93')} />
              <Text style={[styles.emptyText, { color: iosColor('secondaryLabel', '#8E8E93') }]}>Todavía no tenés consumidores vinculados</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.sectionLabel, { color: iosColor('secondaryLabel', '#8E8E93') }]}>CÓDIGOS DE INVITACIÓN</Text>
        <Pressable style={[styles.outlineButton, { borderColor: iosColor('systemBlue', '#007AFF') }]} onPress={openGenerateSheet}>
          <Text style={[styles.outlineButtonText, { color: iosColor('systemBlue', '#007AFF') }]}>Generar código</Text>
        </Pressable>
        <View style={[styles.group, { backgroundColor: iosColor('secondarySystemGroupedBackground', '#FFF') }]}>
          {sortedCodes.map((code, idx) => {
            const status = statusForCode(code);
            const canDelete = code.uses_count === 0;
            const row = (
              <View
                style={[
                  styles.codeRow,
                  idx < sortedCodes.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: iosColor('separator', '#C6C6C8') } : null,
                ]}
              >
                <Text style={[styles.codeText, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>{code.code}</Text>
                <View style={styles.codeMeta}>
                  <View style={[styles.usageBadge, { backgroundColor: iosColor('tertiarySystemBackground', '#EFEFF4') }]}>
                    <Text style={[styles.usageBadgeText, { color: iosColor('secondaryLabel', '#8E8E93') }]}>
                      {code.uses_count}/{code.max_uses}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: iosColor(status.colorName, status.fallback) }]}>{status.label}</Text>
                  </View>
                </View>
              </View>
            );
            if (!canDelete) return <View key={code.id}>{row}</View>;

            return (
              <View key={code.id}>
                {row}
                <View style={styles.codeActionsRow}>
                  <Pressable
                    style={[styles.inlineDeleteButton, { backgroundColor: iosColor('systemRed', '#FF3B30') }]}
                    onPress={async () => {
                      await deleteCode(code.id);
                    }}
                  >
                    <Text style={styles.deleteActionText}>Eliminar</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
          {!sortedCodes.length ? (
            <View style={styles.emptyBlock}>
              <Text style={[styles.emptyText, { color: iosColor('secondaryLabel', '#8E8E93') }]}>No hay códigos creados todavía.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={!!selectedConsumer} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedConsumer(null)}>
        <SafeAreaView style={[styles.safe, { backgroundColor: iosColor('systemBackground', isDark ? '#000' : '#FFF') }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>
              {selectedConsumer?.displayName || 'Consumidor'}
            </Text>
            <Pressable onPress={() => setSelectedConsumer(null)}>
              <Text style={{ color: iosColor('systemBlue', '#007AFF'), fontSize: 17 }}>Cerrar</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}>
            {consumerItems.map((item) => (
              <View key={item.id} style={[styles.modalRow, { borderBottomColor: iosColor('separator', '#C6C6C8') }]}>
                <Text style={styles.modalEmoji}>{item.recipe?.emoji || '🍽️'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalRecipe, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>{item.recipe?.name || 'Receta'}</Text>
                  <Text style={[styles.modalMeta, { color: iosColor('secondaryLabel', '#8E8E93') }]}>
                    {item.days.map((d) => dayNames[d] || d).join(', ')} · {item.servings} porciones
                  </Text>
                </View>
              </View>
            ))}
            {!consumerItems.length ? (
              <Text style={[styles.emptyText, { color: iosColor('secondaryLabel', '#8E8E93'), marginTop: 24 }]}>
                Sin recetas asignadas esta semana.
              </Text>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {showDatePicker ? (
        <DateTimePicker
          value={new Date()}
          mode="date"
          onChange={(_event, date) => {
            setShowDatePicker(false);
            if (date && pendingUses) {
              void createAndShare(pendingUses, date);
            }
            setPendingUses(null);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 120 },
  title: { fontSize: 34, fontWeight: '700', marginTop: 8, marginBottom: 14 },
  sectionLabel: { fontSize: 12, fontWeight: '600', marginTop: 16, marginBottom: 6, paddingHorizontal: 4 },
  group: { borderRadius: 12, overflow: 'hidden' },
  row: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { fontSize: 14, fontWeight: '700' },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSubtitle: { marginTop: 2, fontSize: 12 },
  emptyBlock: { minHeight: 74, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  outlineButton: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  outlineButtonText: { fontSize: 16, fontWeight: '600' },
  codeRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  codeText: { fontSize: 17, fontFamily: 'Courier', fontWeight: '600' },
  codeMeta: { flexDirection: 'row', alignItems: 'center' },
  usageBadge: { borderRadius: 10, minHeight: 22, paddingHorizontal: 8, justifyContent: 'center' },
  usageBadgeText: { fontSize: 12, fontWeight: '600' },
  statusBadge: { borderRadius: 10, minHeight: 22, paddingHorizontal: 8, justifyContent: 'center', marginLeft: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  codeActionsRow: { paddingHorizontal: 12, paddingBottom: 8 },
  inlineDeleteButton: { minHeight: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  deleteActionText: { color: '#FFF', fontWeight: '700' },
  modalHeader: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  modalEmoji: { fontSize: 22, marginRight: 10 },
  modalRecipe: { fontSize: 16, fontWeight: '600' },
  modalMeta: { marginTop: 2, fontSize: 12 },
});
