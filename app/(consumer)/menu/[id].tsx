import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  PlatformColor,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useConsumerStore } from '../../../lib/stores/consumerStore';

function iosColor(name: string, fallback: string) {
  return Platform.OS === 'ios' ? PlatformColor(name) : fallback;
}

const dayOptions = [
  { key: 'mon', label: 'L' },
  { key: 'tue', label: 'M' },
  { key: 'wed', label: 'X' },
  { key: 'thu', label: 'J' },
  { key: 'fri', label: 'V' },
  { key: 'sat', label: 'S' },
  { key: 'sun', label: 'D' },
];

export default function RecipeDetailScreen() {
  const isDark = useColorScheme() === 'dark';
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipeId = Number(id);

  const recipes = useConsumerStore((s) => s.recipes);
  const planItems = useConsumerStore((s) => s.planItems);
  const upsertPlanItem = useConsumerStore((s) => s.upsertPlanItem);
  const removePlanItem = useConsumerStore((s) => s.removePlanItem);

  const recipe = recipes.find((item) => item.id === recipeId) ?? null;
  const existingPlanItem = planItems.find((item) => item.recipe_id === recipeId) ?? null;

  const [servings, setServings] = useState(existingPlanItem?.servings ?? 1);
  const [days, setDays] = useState<string[]>(existingPlanItem?.days ?? []);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!recipe) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: iosColor('systemBackground', isDark ? '#000' : '#FFF') }]}>
        <View style={styles.missingWrap}>
          <Text style={[styles.missingText, { color: iosColor('secondaryLabel', '#8E8E93') }]}>No encontramos esta receta.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  const showIngredients = (recipe as any).show_ingredients ?? true;
  const showSteps = (recipe as any).show_steps ?? true;

  const toggleDay = async (day: string) => {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
    await Haptics.selectionAsync();
  };

  const onOpenSheet = () => {
    if (existingPlanItem) {
      setServings(existingPlanItem.servings ?? 1);
      setDays(existingPlanItem.days ?? []);
    }
    setSheetOpen(true);
  };

  const onSave = async () => {
    if (!days.length) {
      Alert.alert('Elegí al menos un día', 'Seleccioná los días para esta receta.');
      return;
    }
    await upsertPlanItem(recipeId, servings, days);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSheetOpen(false);
  };

  const onRemove = () => {
    if (!existingPlanItem) return;
    Alert.alert('Quitar del plan', '¿Querés quitar esta receta de tu semana?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          await removePlanItem(existingPlanItem.id);
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          setSheetOpen(false);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: iosColor('systemBackground', isDark ? '#000' : '#FFF') }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroWrap}>
          {recipe.photo_url ? (
            <Image source={{ uri: recipe.photo_url }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroFallback, { backgroundColor: iosColor('tertiarySystemBackground', '#EFEFF4') }]}>
              <Text style={styles.heroEmoji}>{recipe.emoji || '🍽️'}</Text>
            </View>
          )}

          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <BlurView intensity={70} tint={isDark ? 'dark' : 'light'} style={styles.backBlur}>
              <Ionicons name="chevron-back" size={20} color={iosColor('label', isDark ? '#FFF' : '#000')} />
            </BlurView>
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={[styles.title, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>{recipe.name}</Text>

          <View style={styles.metaWrap}>
            <View style={[styles.metaChip, { backgroundColor: iosColor('secondarySystemBackground', '#F2F2F7') }]}>
              <Text style={[styles.metaText, { color: iosColor('secondaryLabel', '#8E8E93') }]}>{recipe.time || '⏱'}</Text>
            </View>
            <View style={[styles.metaChip, { backgroundColor: iosColor('secondarySystemBackground', '#F2F2F7') }]}>
              <Text style={[styles.metaText, { color: iosColor('secondaryLabel', '#8E8E93') }]}>{recipe.difficulty || 'Media'}</Text>
            </View>
            <View style={[styles.metaChip, { backgroundColor: iosColor('secondarySystemBackground', '#F2F2F7') }]}>
              <Text style={[styles.metaText, { color: iosColor('secondaryLabel', '#8E8E93') }]}>{recipe.cat || 'General'}</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>Ingredientes</Text>
          {showIngredients ? (
            ingredients.length ? (
              ingredients.map((ingredient: any, index: number) => (
                <View key={`${ingredient?.name || 'ing'}-${index}`} style={styles.row}>
                  <Text style={[styles.rowText, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>
                    • {ingredient?.name || ingredient}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.secondaryText, { color: iosColor('secondaryLabel', '#8E8E93') }]}>Sin ingredientes cargados.</Text>
            )
          ) : (
            <Text style={[styles.secondaryText, { color: iosColor('secondaryLabel', '#8E8E93') }]}>Consultá con tu chef</Text>
          )}

          <Text style={[styles.sectionTitle, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>Preparación</Text>
          {showSteps ? (
            steps.length ? (
              steps.map((step, index) => (
                <View key={`${step}-${index}`} style={styles.row}>
                  <Text style={[styles.rowText, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>
                    {index + 1}. {step}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.secondaryText, { color: iosColor('secondaryLabel', '#8E8E93') }]}>Sin pasos cargados.</Text>
            )
          ) : (
            <Text style={[styles.secondaryText, { color: iosColor('secondaryLabel', '#8E8E93') }]}>Consultá con tu chef</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomCtaWrap}>
        <Pressable style={styles.primaryButton} onPress={onOpenSheet}>
          <Text style={styles.primaryButtonText}>{existingPlanItem ? 'Editar mi semana' : 'Agregar a mi semana'}</Text>
        </Pressable>
      </View>

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheetOpen(false)} />
        <View style={[styles.sheetModal, { backgroundColor: iosColor('secondarySystemBackground', isDark ? '#1C1C1E' : '#F2F2F7') }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetContent}>
            <Text style={[styles.sheetTitle, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>
              {existingPlanItem ? 'Actualizar' : 'Agregar a mi semana'}
            </Text>

            <View style={styles.stepperWrap}>
              <Pressable
                style={[styles.stepperButton, { backgroundColor: iosColor('tertiarySystemBackground', '#FFFFFF') }]}
                onPress={() => setServings((prev) => Math.max(1, prev - 1))}
              >
                <Text style={[styles.stepperSymbol, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>−</Text>
              </Pressable>
              <Text style={[styles.servingsText, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>{servings} porciones</Text>
              <Pressable
                style={[styles.stepperButton, { backgroundColor: iosColor('tertiarySystemBackground', '#FFFFFF') }]}
                onPress={() => setServings((prev) => prev + 1)}
              >
                <Text style={[styles.stepperSymbol, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>+</Text>
              </Pressable>
            </View>

            <View style={styles.daysWrap}>
              {dayOptions.map((day) => {
                const active = days.includes(day.key);
                return (
                  <Pressable
                    key={day.key}
                    onPress={() => void toggleDay(day.key)}
                    style={[
                      styles.dayChip,
                      {
                        backgroundColor: active ? iosColor('systemBlue', '#007AFF') : iosColor('tertiarySystemBackground', '#FFFFFF'),
                      },
                    ]}
                  >
                    <Text style={[styles.dayChipText, { color: active ? '#FFF' : iosColor('label', isDark ? '#FFF' : '#000') }]}>
                      {day.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.primaryButton} onPress={() => void onSave()}>
              <Text style={styles.primaryButtonText}>{existingPlanItem ? 'Actualizar' : 'Guardar en mi semana'}</Text>
            </Pressable>

            {existingPlanItem ? (
              <Pressable style={styles.destructiveButton} onPress={onRemove}>
                <Text style={[styles.destructiveText, { color: iosColor('systemRed', '#FF3B30') }]}>Quitar del plan</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingBottom: 120 },
  missingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  missingText: { fontSize: 16 },
  heroWrap: { height: 220, width: '100%' },
  heroImage: { width: '100%', height: '100%' },
  heroFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  heroEmoji: { fontSize: 82 },
  backButton: { position: 'absolute', top: 12, left: 14 },
  backBlur: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  body: { paddingHorizontal: 20, paddingTop: 14 },
  title: { fontSize: 28, fontWeight: '700' },
  metaWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  metaChip: { borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8, marginBottom: 8 },
  metaText: { fontSize: 12, fontWeight: '600' },
  sectionTitle: { fontSize: 22, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  row: { paddingVertical: 6 },
  rowText: { fontSize: 16, lineHeight: 22 },
  secondaryText: { fontSize: 15, fontStyle: 'italic' },
  bottomCtaWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetModal: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '75%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#B8B8BC',
    marginTop: 8,
  },
  primaryButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
  sheetContent: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  sheetTitle: { fontSize: 22, fontWeight: '700' },
  stepperWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  stepperButton: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  stepperSymbol: { fontSize: 24, fontWeight: '600' },
  servingsText: { fontSize: 18, fontWeight: '600' },
  daysWrap: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  dayChip: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  dayChipText: { fontSize: 16, fontWeight: '700' },
  destructiveButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  destructiveText: { fontSize: 16, fontWeight: '600' },
});
