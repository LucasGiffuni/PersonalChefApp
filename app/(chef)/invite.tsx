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
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { lightTheme, useTheme } from '../../lib/theme';
import { useInviteStore } from '../../lib/stores/inviteStore';
import { PlanItemWithRecipe, startOfWeekMonday, toISODate } from '../../lib/stores/consumerStore';
import { ConsumerWithProfile, useChefDashboardStore } from '../../lib/stores/chefDashboardStore';
import { useAuthStore } from '../../lib/stores/authStore';
import { supabase } from '../../lib/supabase';

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
  const { colors, scheme } = useTheme();
  const userId = useAuthStore((s) => s.session?.user?.id);
  const { codes, fetchCodes, createCode, deleteCode } = useInviteStore();
  const consumers = useChefDashboardStore((s) => s.consumers);
  const fetchConsumers = useChefDashboardStore((s) => s.fetchConsumers);

  const [selectedConsumer, setSelectedConsumer] = useState<ConsumerWithProfile | null>(null);
  const [consumerItems, setConsumerItems] = useState<PlanItemWithRecipe[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingUses, setPendingUses] = useState<number | null>(null);
  const [removingById, setRemovingById] = useState<Record<string, boolean>>({});

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

  const unlinkConsumer = async (consumer: ConsumerWithProfile) => {
    if (!userId) {
      Alert.alert('Sesión no disponible', 'Volvé a iniciar sesión e intentá nuevamente.');
      return;
    }

    Alert.alert(
      'Eliminar consumidor',
      `¿Querés desvincular a ${consumer.displayName} de tu tutela?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingById((prev) => ({ ...prev, [consumer.consumerId]: true }));
              const { error } = await supabase
                .from('chef_consumers')
                .delete()
                .eq('chef_id', userId)
                .eq('consumer_id', consumer.consumerId);

              if (error) {
                Alert.alert('No se pudo eliminar', error.message);
                return;
              }

              if (selectedConsumer?.consumerId === consumer.consumerId) {
                setSelectedConsumer(null);
                setConsumerItems([]);
              }
              await fetchConsumers();
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } finally {
              setRemovingById((prev) => ({ ...prev, [consumer.consumerId]: false }));
            }
          },
        },
      ]
    );
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.label }]}>Invitaciones</Text>

        <Text style={[styles.sectionLabel, { color: colors.secondaryLabel }]}>CONSUMIDORES VINCULADOS</Text>
        <View style={[styles.group, { backgroundColor: colors.card }]}>
          {consumers.map((consumer, idx) => (
            <View
              key={consumer.consumerId}
              style={[styles.row, idx < consumers.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator } : null]}
            >
              <Pressable
                onPress={() => void openConsumerSheet(consumer)}
                style={styles.consumerInfoButton}
              >
                <View style={[styles.avatar, { backgroundColor: 'rgba(0,122,255,0.15)' }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {consumer.displayName.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.label }]}>{consumer.displayName}</Text>
                  <Text style={[styles.rowSubtitle, { color: colors.secondaryLabel }]}>
                    Vinculado {consumer.linkedAt ? new Date(consumer.linkedAt).toLocaleDateString('es-UY') : '—'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.tertiaryLabel} />
              </Pressable>

              <Pressable
                onPress={() => void unlinkConsumer(consumer)}
                disabled={Boolean(removingById[consumer.consumerId])}
                style={({ pressed }) => [
                  styles.unlinkButton,
                  { backgroundColor: colors.danger },
                  pressed && { opacity: 0.88 },
                  removingById[consumer.consumerId] && { opacity: 0.6 },
                ]}
              >
                <Ionicons name="trash-outline" size={14} color={colors.card} />
                <Text style={styles.unlinkButtonText}>
                  {removingById[consumer.consumerId] ? 'Eliminando…' : 'Eliminar'}
                </Text>
              </Pressable>
            </View>
          ))}
          {!consumers.length ? (
            <View style={styles.emptyBlock}>
              <Ionicons name="person-add-outline" size={26} color={colors.secondaryLabel} />
              <Text style={[styles.emptyText, { color: colors.secondaryLabel }]}>Todavía no tenés consumidores vinculados</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.secondaryLabel }]}>CÓDIGOS DE INVITACIÓN</Text>
        <Pressable style={[styles.outlineButton, { borderColor: colors.primary }]} onPress={openGenerateSheet}>
          <Text style={[styles.outlineButtonText, { color: colors.primary }]}>Generar código</Text>
        </Pressable>
        <View style={[styles.group, { backgroundColor: colors.card }]}>
          {sortedCodes.map((code, idx) => {
            const status = statusForCode(code);
            const canDelete = code.uses_count === 0;
            const row = (
              <View
                style={[
                  styles.codeRow,
                  idx < sortedCodes.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator } : null,
                ]}
              >
                <Text style={[styles.codeText, { color: colors.label }]}>{code.code}</Text>
                <View style={styles.codeMeta}>
                  <View style={[styles.usageBadge, { backgroundColor: colors.background }]}>
                    <Text style={[styles.usageBadgeText, { color: colors.secondaryLabel }]}>
                      {code.uses_count}/{code.max_uses}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.fallback }]}>{status.label}</Text>
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
                    style={[styles.inlineDeleteButton, { backgroundColor: colors.danger }]}
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
              <Text style={[styles.emptyText, { color: colors.secondaryLabel }]}>No hay códigos creados todavía.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={!!selectedConsumer} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedConsumer(null)}>
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.label }]}>
              {selectedConsumer?.displayName || 'Consumidor'}
            </Text>
            <Pressable onPress={() => setSelectedConsumer(null)}>
              <Text style={{ color: colors.primary, fontSize: 17 }}>Cerrar</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}>
            {consumerItems.map((item) => (
              <View key={item.id} style={[styles.modalRow, { borderBottomColor: colors.separator }]}>
                <Text style={styles.modalEmoji}>{item.recipe?.emoji || '🍽️'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalRecipe, { color: colors.label }]}>{item.recipe?.name || 'Receta'}</Text>
                  <Text style={[styles.modalMeta, { color: colors.secondaryLabel }]}>
                    {item.days.map((d) => dayNames[d] || d).join(', ')} · {item.servings} porciones
                  </Text>
                </View>
              </View>
            ))}
            {!consumerItems.length ? (
              <Text style={[styles.emptyText, { color: colors.secondaryLabel, marginTop: 24 }]}>
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
  consumerInfoButton: { flex: 1, minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingRight: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { fontSize: 14, fontWeight: '700' },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSubtitle: { marginTop: 2, fontSize: 12 },
  unlinkButton: {
    minHeight: 32,
    borderRadius: 9,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  unlinkButtonText: { color: lightTheme.colors.card, fontSize: 12, fontWeight: '700' },
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
  deleteActionText: { color: lightTheme.colors.card, fontWeight: '700' },
  modalHeader: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  modalEmoji: { fontSize: 22, marginRight: 10 },
  modalRecipe: { fontSize: 16, fontWeight: '600' },
  modalMeta: { marginTop: 2, fontSize: 12 },
});
