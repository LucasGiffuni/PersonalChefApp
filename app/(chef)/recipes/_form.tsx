import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import {
  fetchIngredients,
  fetchUsdaFoodNutrition,
  searchUsdaIngredients,
} from '../../../lib/services/ingredients';
import { lightTheme, useTheme } from '../../../lib/theme';
import { IngredientCatalogItem, IngredientPriceItem } from '../../../lib/types';
import { computeNutrition } from '../../../lib/utils/calculations';
import { IngredientUnit, UNIT_OPTIONS, toGrams } from '../../../lib/utils/units';

// ─── Types ────────────────────────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'hard';

type IngredientSuggestion = {
  id: string;
  label: string;
  source: 'catalog' | 'usda';
  catalogId?: string;
  fdcId?: number;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  fatPer100g?: number;
  carbsPer100g?: number;
  pricePer100g?: number;
};

export type RecipeFormIngredient = {
  id: string;
  name: string;
  source: 'catalog' | 'usda' | 'manual';
  catalogIngredientId?: string;
  fdcId?: number;
  quantity: number;
  unit: IngredientUnit;
  grams: number;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  fatPer100g?: number;
  carbsPer100g?: number;
  pricePer100g?: number;
};

export type RecipeFormData = {
  name: string;
  cat: string;
  emoji: string;
  description: string;
  time: string;
  difficulty: Difficulty;
  servings: number;
  photo_url: string;
  photoUri: string | null;
  is_published: boolean;
  base_price: number;
  ingredients: RecipeFormIngredient[];
  steps: string[];
};

type Props = {
  initialValues?: Partial<RecipeFormData>;
  onSave: (value: RecipeFormData) => Promise<void>;
  onCancel: () => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = ['Entrada', 'Principal', 'Postre', 'Sopa', 'Snack', 'Otro'];
const SERVING_OPTIONS = [1, 2, 4, 6, 8, 12];
const DIFFICULTY_OPTIONS: Array<{ key: Difficulty; label: string; color: string }> = [
  { key: 'easy', label: 'Baja', color: '#34C759' },
  { key: 'medium', label: 'Media', color: '#FF9500' },
  { key: 'hard', label: 'Alta', color: '#FF3B30' },
];

// ─── Colors ───────────────────────────────────────────────────────────────────

function useColors() {
  const { colors } = useTheme();
  return useMemo(
    () => ({
      groupedBg: colors.background,
      cardBg: colors.card,
      label: colors.label,
      secondaryLabel: colors.secondaryLabel,
      tertiaryLabel: colors.tertiaryLabel,
      separator: colors.separator,
      tertiaryGroupedBg: colors.background,
      secondaryGroupedBg: colors.background,
      systemBlue: colors.primary,
      systemGreen: colors.success,
      systemOrange: colors.warning,
      systemRed: colors.danger,
      systemGray: colors.secondaryLabel,
    }),
    [colors]
  );
}

function rowSep(color: string) {
  return { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color } as const;
}

// ─── IngredientSearchModal ────────────────────────────────────────────────────

type IngredientSearchModalProps = {
  visible: boolean;
  catalog: IngredientCatalogItem[];
  priceByIngredientId: Map<string, number>;
  onAdd: (ingredient: RecipeFormIngredient) => void;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
};

function IngredientSearchModal({
  visible,
  catalog,
  priceByIngredientId,
  onAdd,
  onClose,
  colors,
}: IngredientSearchModalProps) {
  const [query, setQuery] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<IngredientUnit>('g');
  const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<IngredientSuggestion | null>(null);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setQuantity('');
      setUnit('g');
      setSuggestions([]);
      setSelectedSuggestion(null);
    }
  }, [visible]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      const q = query.trim();
      if (q.length < 2) { setSuggestions([]); return; }
      setSearching(true);
      const norm = q.toLowerCase();
      const localHits: IngredientSuggestion[] = catalog
        .filter((item) => `${item.name} ${item.display_name ?? ''}`.toLowerCase().includes(norm))
        .slice(0, 8)
        .map((item) => ({
          id: `catalog-${item.id}`,
          label: item.display_name || item.name,
          source: 'catalog' as const,
          catalogId: String(item.id),
          caloriesPer100g: Number(item.calories_per_100g ?? 0),
          proteinPer100g: Number(item.protein_per_100g ?? 0),
          fatPer100g: Number(item.fat_per_100g ?? 0),
          carbsPer100g: Number(item.carbs_per_100g ?? 0),
          pricePer100g: priceByIngredientId.get(String(item.id)),
        }));
      try {
        const usdaHits = await searchUsdaIngredients(q);
        if (!active) return;
        const merged = [...localHits];
        usdaHits.slice(0, 5).forEach((item) => {
          if (!merged.some((e) => e.label.toLowerCase() === item.description.toLowerCase())) {
            merged.push({ id: `usda-${item.fdcId}`, label: item.description, source: 'usda' as const, fdcId: item.fdcId });
          }
        });
        setSuggestions(merged);
      } catch {
        if (active) setSuggestions(localHits);
      } finally {
        if (active) setSearching(false);
      }
    };
    const timer = setTimeout(() => { void run(); }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [catalog, query, priceByIngredientId]);

  const canAdd =
    (selectedSuggestion?.label ?? query).trim().length > 0 &&
    Number.isFinite(Number(quantity.replace(',', '.'))) &&
    Number(quantity.replace(',', '.')) > 0;

  const handleAdd = async () => {
    const baseName = (selectedSuggestion?.label ?? query).trim();
    const qty = Number(quantity.replace(',', '.'));
    if (!baseName || !Number.isFinite(qty) || qty <= 0) return;
    setAdding(true);
    let resolved = selectedSuggestion;
    if (resolved?.source === 'usda' && resolved.fdcId) {
      const data = await fetchUsdaFoodNutrition(resolved.fdcId);
      if (data) resolved = { ...resolved, ...data };
    }
    const ingredient: RecipeFormIngredient = {
      id: `ing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: baseName,
      source: resolved?.source ?? 'manual',
      catalogIngredientId: resolved?.catalogId,
      fdcId: resolved?.fdcId,
      quantity: qty,
      unit,
      grams: toGrams(qty, unit, baseName),
      caloriesPer100g: resolved?.caloriesPer100g,
      proteinPer100g: resolved?.proteinPer100g,
      fatPer100g: resolved?.fatPer100g,
      carbsPer100g: resolved?.carbsPer100g,
      pricePer100g: resolved?.pricePer100g,
    };
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAdd(ingredient);
    setAdding(false);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.groupedBg }}>
        <View style={[s.modalHeader, { borderBottomColor: colors.separator, backgroundColor: colors.cardBg }]}>
          <Pressable onPress={onClose} style={s.modalHeaderSide} hitSlop={8}>
            <Text style={{ color: colors.systemBlue, fontSize: 17 }}>Cancelar</Text>
          </Pressable>
          <Text style={[s.modalHeaderTitle, { color: colors.label }]}>Agregar ingrediente</Text>
          <Pressable onPress={() => void handleAdd()} disabled={!canAdd || adding} style={s.modalHeaderSide} hitSlop={8}>
            <Text style={{ color: canAdd && !adding ? colors.systemBlue : colors.systemGray, fontSize: 17, fontWeight: '600', textAlign: 'right' }}>
              {adding ? 'Agregando…' : 'Agregar'}
            </Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={[s.sectionHeader, { color: colors.secondaryLabel }]}>BUSCAR</Text>
            <View style={[s.card, { backgroundColor: colors.cardBg }]}>
              <TextInput
                value={query}
                onChangeText={(t) => { setQuery(t); setSelectedSuggestion(null); }}
                placeholder="Ingrediente (catálogo + USDA)"
                placeholderTextColor={colors.tertiaryLabel}
                style={[s.rowInput, { color: colors.label }]}
                autoFocus
                returnKeyType="search"
              />
            </View>

            {query.trim().length >= 2 && (
              <View style={[s.card, { backgroundColor: colors.cardBg, marginTop: 2 }]}>
                {searching ? (
                  <View style={s.suggestionLoading}><ActivityIndicator size="small" color={colors.systemBlue} /></View>
                ) : suggestions.length > 0 ? (
                  suggestions.map((item, idx) => (
                    <Pressable
                      key={item.id}
                      onPress={() => { setSelectedSuggestion(item); setQuery(item.label); setSuggestions([]); }}
                      style={[
                        s.suggestionRow,
                        idx > 0 && rowSep(colors.separator),
                        selectedSuggestion?.id === item.id && { backgroundColor: colors.tertiaryGroupedBg },
                      ]}
                    >
                      <Text style={{ flex: 1, fontSize: 15, color: colors.label }} numberOfLines={1}>{item.label}</Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: item.source === 'catalog' ? colors.systemGreen : colors.systemBlue }}>
                        {item.source === 'catalog' ? 'Catálogo' : 'USDA'}
                      </Text>
                    </Pressable>
                  ))
                ) : (
                  <Text style={[s.emptyText, { color: colors.secondaryLabel }]}>Sin coincidencias</Text>
                )}
              </View>
            )}

            <Text style={[s.sectionHeader, { color: colors.secondaryLabel }]}>CANTIDAD</Text>
            <View style={[s.card, { backgroundColor: colors.cardBg }]}>
              <View style={s.row}>
                <Text style={[s.rowLabel, { color: colors.label }]}>Cantidad</Text>
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="0"
                  placeholderTextColor={colors.tertiaryLabel}
                  keyboardType="decimal-pad"
                  style={[s.rowInputRight, { color: colors.label }]}
                  returnKeyType="done"
                />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, gap: 8 }}
                style={[rowSep(colors.separator)]}
              >
                {UNIT_OPTIONS.map((u) => (
                  <Pressable
                    key={u}
                    onPress={() => setUnit(u)}
                    style={[s.chip, { backgroundColor: u === unit ? colors.systemBlue : colors.tertiaryGroupedBg }]}
                  >
                    <Text style={[s.chipText, { color: u === unit ? colors.cardBg : colors.label }]}>{u}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── DescriptionModal ─────────────────────────────────────────────────────────

function DescriptionModal({
  visible,
  value,
  onDone,
  colors,
}: {
  visible: boolean;
  value: string;
  onDone: (text: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [text, setText] = useState(value);
  useEffect(() => { if (visible) setText(value); }, [visible, value]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => onDone(text)}>
      <View style={{ flex: 1, backgroundColor: colors.groupedBg }}>
        <View style={[s.modalHeader, { borderBottomColor: colors.separator, backgroundColor: colors.cardBg }]}>
          <View style={s.modalHeaderSide} />
          <Text style={[s.modalHeaderTitle, { color: colors.label }]}>Descripción</Text>
          <Pressable onPress={() => onDone(text)} style={s.modalHeaderSide} hitSlop={8}>
            <Text style={{ color: colors.systemBlue, fontSize: 17, fontWeight: '600', textAlign: 'right' }}>Listo</Text>
          </Pressable>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Escribe una descripción de la receta..."
            placeholderTextColor={colors.tertiaryLabel}
            multiline
            style={[s.bigTextInput, { color: colors.label, backgroundColor: colors.cardBg }]}
            autoFocus
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── AddStepModal ─────────────────────────────────────────────────────────────

function AddStepModal({
  visible,
  onAdd,
  onClose,
  colors,
}: {
  visible: boolean;
  onAdd: (text: string) => void;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [text, setText] = useState('');
  useEffect(() => { if (visible) setText(''); }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.groupedBg }}>
        <View style={[s.modalHeader, { borderBottomColor: colors.separator, backgroundColor: colors.cardBg }]}>
          <Pressable onPress={onClose} style={s.modalHeaderSide} hitSlop={8}>
            <Text style={{ color: colors.systemBlue, fontSize: 17 }}>Cancelar</Text>
          </Pressable>
          <Text style={[s.modalHeaderTitle, { color: colors.label }]}>Nuevo paso</Text>
          <Pressable
            onPress={() => { if (text.trim()) { onAdd(text.trim()); onClose(); } }}
            disabled={!text.trim()}
            style={s.modalHeaderSide}
            hitSlop={8}
          >
            <Text style={{ color: text.trim() ? colors.systemBlue : colors.systemGray, fontSize: 17, fontWeight: '600', textAlign: 'right' }}>
              Agregar
            </Text>
          </Pressable>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Describí el paso..."
            placeholderTextColor={colors.tertiaryLabel}
            multiline
            style={[s.bigTextInput, { color: colors.label, backgroundColor: colors.cardBg }]}
            autoFocus
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── RecipeForm ───────────────────────────────────────────────────────────────

export function RecipeForm({ initialValues, onSave, onCancel }: Props) {
  const colors = useColors();
  const isEdit = initialValues != null;

  const [name, setName] = useState(initialValues?.name ?? '');
  const [time, setTime] = useState(initialValues?.time ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [cat, setCat] = useState(initialValues?.cat ?? 'Principal');
  const [difficulty, setDifficulty] = useState<Difficulty>(initialValues?.difficulty ?? 'medium');
  const [servings, setServings] = useState(initialValues?.servings ?? 4);
  const [basePrice, setBasePrice] = useState(initialValues?.base_price ?? 0);
  const [ingredients, setIngredients] = useState<RecipeFormIngredient[]>(initialValues?.ingredients ?? []);
  const [steps, setSteps] = useState<string[]>(initialValues?.steps ?? []);
  const [isPublished, setIsPublished] = useState(initialValues?.is_published ?? false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUrl] = useState(initialValues?.photo_url ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [catalog, setCatalog] = useState<IngredientCatalogItem[]>([]);
  const [priceByIngredientId, setPriceByIngredientId] = useState<Map<string, number>>(new Map());
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(toastOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [toastOpacity]);

  const markDirty = useCallback(() => setIsDirty(true), []);
  const canSave = name.trim().length > 0;

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await fetchIngredients();
        if (!active) return;
        setCatalog(data.catalog);
        const map = new Map<string, number>();
        (data.prices as IngredientPriceItem[]).forEach((e) =>
          map.set(String(e.ingredient_id), Number(e.price_per_100g ?? 0))
        );
        setPriceByIngredientId(map);
      } catch {
        if (active) { setCatalog([]); setPriceByIngredientId(new Map()); }
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const handleCancel = useCallback(() => {
    if (!isDirty) { onCancel(); return; }

    if (Platform.OS === 'web') {
      const confirmDiscard = (globalThis as { confirm?: (message?: string) => boolean }).confirm;
      const shouldDiscard = confirmDiscard?.('Perderás todos los cambios realizados. ¿Descartar cambios?');
      if (shouldDiscard) onCancel();
      return;
    }

    Alert.alert('¿Descartar cambios?', 'Perderás todos los cambios realizados.', [
      { text: 'Seguir editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: onCancel },
    ]);
  }, [isDirty, onCancel]);

  const handleSave = useCallback(async (forcePublish = false) => {
    if (!canSave || isSaving) return;
    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        cat: cat.trim() || 'Principal',
        emoji: '🍽️',
        description: description.trim(),
        time: time.trim(),
        difficulty,
        servings,
        base_price: basePrice,
        photo_url: photoUrl,
        photoUri,
        is_published: forcePublish ? true : isPublished,
        ingredients,
        steps,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Receta guardada');
    } catch (e: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('No se pudo guardar');
      Alert.alert('Error al guardar', e?.message ?? 'Inténtalo de nuevo.');
      setIsSaving(false);
    }
  }, [canSave, isSaving, onSave, name, cat, description, time, difficulty, servings, basePrice, photoUrl, photoUri, isPublished, ingredients, steps, showToast]);

  const openPhotoPicker = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const pick = async (source: 'camera' | 'gallery') => {
      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: 'images',
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      };
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permisos necesarios', 'Necesitamos acceso a tu cámara.');
          return;
        }
        result = await ImagePicker.launchCameraAsync(opts);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permisos necesarios', 'Necesitamos acceso a tu galería.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(opts);
      }
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        markDirty();
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Tomar foto', 'Elegir de galería', 'Cancelar'], cancelButtonIndex: 2 },
        (idx) => {
          if (idx === 0) void pick('camera');
          else if (idx === 1) void pick('gallery');
        }
      );
    } else {
      Alert.alert('Agregar foto', '', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Tomar foto', onPress: () => void pick('camera') },
        { text: 'Elegir de galería', onPress: () => void pick('gallery') },
      ]);
    }
  }, [markDirty]);

  const addStep = useCallback(() => {
    if (Platform.OS === 'ios') {
      Alert.prompt('Nuevo paso', 'Describí el paso de preparación', (text) => {
        const trimmed = text?.trim();
        if (trimmed) {
          setSteps((prev) => [...prev, trimmed]);
          markDirty();
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }, 'plain-text');
    } else {
      setShowAddStepModal(true);
    }
  }, [markDirty]);

  const hasNutrition = ingredients.some((i) => i.caloriesPer100g != null && Number(i.caloriesPer100g) > 0);

  const nutrition = useMemo(
    () => computeNutrition(ingredients, servings),
    [ingredients, servings]
  );

  const costPerServing = useMemo(() => {
    const total = ingredients.reduce((acc, item) => {
      const pricePer100g = Number(item.pricePer100g ?? 0);
      const grams = Number(item.grams ?? 0);
      return acc + (grams / 100) * pricePer100g;
    }, 0);
    return total / Math.max(1, servings);
  }, [ingredients, servings]);

  const suggestedPrice = useMemo(() => {
    if (costPerServing <= 0) return basePrice > 0 ? basePrice : 0;
    return Math.max(basePrice, Math.round(costPerServing * 2.4 * 10) / 10);
  }, [basePrice, costPerServing]);

  const displayPhoto = photoUri ?? (photoUrl || null);

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.groupedBg }}>
        <Animated.View pointerEvents="none" style={[s.toastWrap, { opacity: toastOpacity }]}>
          <View style={s.toast}>
            <Text style={s.toastText}>{toastMessage}</Text>
          </View>
        </Animated.View>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: colors.groupedBg }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
          >

          {/* ── 1: Foto hero ── */}
          <TouchableOpacity
            onPress={() => void openPhotoPicker()}
            activeOpacity={0.85}
            style={[s.photoHero, { backgroundColor: colors.secondaryGroupedBg }]}
          >
            {displayPhoto ? (
              <>
                <Image source={{ uri: displayPhoto }} style={s.photoImage} />
                <BlurView intensity={60} tint="systemMaterial" style={s.photoOverlay}>
                  <Ionicons name="camera-outline" size={16} color={colors.label} />
                  <Text style={s.photoOverlayText}>Cambiar</Text>
                </BlurView>
              </>
            ) : (
              <View style={s.photoPlaceholder}>
                <Ionicons name="camera-outline" size={32} color={colors.systemGray} />
                <Text style={[s.photoPlaceholderMain, { color: colors.secondaryLabel }]}>Agregar foto</Text>
                <Text style={[s.photoPlaceholderSub, { color: colors.tertiaryLabel }]}>Cámara · Galería</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ── 2: Información ── */}
          <Text style={[s.sectionHeader, { color: colors.secondaryLabel }]}>INFORMACIÓN</Text>
          <View style={[s.card, { backgroundColor: colors.cardBg }]}>
            <View style={s.row}>
              <Text style={[s.rowLabel, { color: colors.label }]}>Nombre</Text>
              <TextInput
                value={name}
                onChangeText={(t) => { setName(t); markDirty(); }}
                placeholder="Tarta de espinacas..."
                placeholderTextColor={colors.tertiaryLabel}
                style={[s.rowInputRight, { color: colors.label }]}
                returnKeyType="next"
                autoFocus={!isEdit}
              />
            </View>
            <View style={[s.row, rowSep(colors.separator)]}>
              <Text style={[s.rowLabel, { color: colors.label }]}>Tiempo</Text>
              <TextInput
                value={time}
                onChangeText={(t) => { setTime(t); markDirty(); }}
                placeholder="ej: 45 min"
                placeholderTextColor={colors.tertiaryLabel}
                style={[s.rowInputRight, { color: colors.label }]}
                returnKeyType="done"
              />
            </View>
            <Pressable
              style={[s.row, rowSep(colors.separator)]}
              onPress={() => setShowDescriptionModal(true)}
            >
              <Text style={[s.rowLabel, { color: colors.label }]}>Descripción</Text>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                <Text
                  style={{ flex: 1, fontSize: 15, color: description ? colors.secondaryLabel : colors.tertiaryLabel, textAlign: 'right' }}
                  numberOfLines={1}
                >
                  {description || 'Opcional'}
                </Text>
                <Text style={{ color: colors.tertiaryLabel, fontSize: 18, marginBottom: 1 }}>›</Text>
              </View>
            </Pressable>
          </View>

          {/* ── 3: Categoría ── */}
          <Text style={[s.sectionHeader, { color: colors.secondaryLabel }]}>CATEGORÍA</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipsScrollRow}
          >
            {CATEGORY_OPTIONS.map((opt) => {
              const active = cat === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={async () => { setCat(opt); markDirty(); await Haptics.selectionAsync(); }}
                  style={[
                    s.chip,
                    {
                      backgroundColor: active ? colors.systemBlue : colors.cardBg,
                      borderWidth: active ? 0 : StyleSheet.hairlineWidth,
                      borderColor: colors.separator,
                    },
                  ]}
                >
                  <Text style={[s.chipText, { color: active ? colors.cardBg : colors.label }]}>{opt}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ── 4: Dificultad ── */}
          <Text style={[s.sectionHeader, { color: colors.secondaryLabel }]}>DIFICULTAD</Text>
          <View style={s.chipsRow}>
            {DIFFICULTY_OPTIONS.map((opt) => {
              const active = difficulty === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={async () => { setDifficulty(opt.key); markDirty(); await Haptics.selectionAsync(); }}
                  style={[
                    s.chip,
                    {
                      flex: 1,
                      backgroundColor: active ? opt.color : colors.cardBg,
                      borderWidth: active ? 0 : StyleSheet.hairlineWidth,
                      borderColor: colors.separator,
                    },
                  ]}
                >
                  <Text style={[s.chipText, { color: active ? colors.cardBg : colors.label }]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── 5: Porciones ── */}
          <Text style={[s.sectionHeader, { color: colors.secondaryLabel }]}>PORCIONES</Text>
          <View style={[s.chipsRow, { flexWrap: 'wrap' }]}>
            {SERVING_OPTIONS.map((n) => {
              const active = servings === n;
              return (
                <Pressable
                  key={n}
                  onPress={async () => { setServings(n); markDirty(); await Haptics.selectionAsync(); }}
                  style={[
                    s.chip,
                    {
                      minWidth: 52,
                      backgroundColor: active ? colors.systemBlue : colors.cardBg,
                      borderWidth: active ? 0 : StyleSheet.hairlineWidth,
                      borderColor: colors.separator,
                    },
                  ]}
                >
                  <Text style={[s.chipText, { color: active ? colors.cardBg : colors.label }]}>{n}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── 6: Precio + preview ── */}
          <Text style={[s.sectionHeader, { color: colors.secondaryLabel }]}>PRECIO</Text>
          <View style={[s.card, { backgroundColor: colors.cardBg }]}>
            <View style={[s.row, { minHeight: 64 }]}>
              <Text style={[s.rowLabel, { color: colors.label }]}>Precio base</Text>
              <View style={s.priceInputWrap}>
                <Text style={[s.priceCurrency, { color: colors.secondaryLabel }]}>$</Text>
                <TextInput
                  value={basePrice ? String(basePrice) : ''}
                  onChangeText={(t) => {
                    const normalized = t.replace(',', '.').replace(/[^\d.]/g, '');
                    setBasePrice(Number(normalized) || 0);
                    markDirty();
                  }}
                  placeholder="0.0"
                  placeholderTextColor={colors.tertiaryLabel}
                  keyboardType="decimal-pad"
                  style={[s.priceInput, { color: colors.label }]}
                />
                <Text style={[s.priceSuffix, { color: colors.secondaryLabel }]}>por porción</Text>
              </View>
            </View>
          </View>

          <Text style={[s.sectionHeader, { color: colors.secondaryLabel }]}>VISTA PREVIA</Text>
          <View style={[s.previewCard, { backgroundColor: colors.cardBg }]}>
            {displayPhoto ? (
              <Image source={{ uri: displayPhoto }} style={s.previewImage} />
            ) : (
              <View style={[s.previewImage, { backgroundColor: colors.tertiaryGroupedBg, alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="restaurant-outline" size={26} color={colors.systemGray} />
              </View>
            )}
            <View style={s.previewBody}>
              <Text style={[s.previewName, { color: colors.label }]} numberOfLines={1}>
                {name.trim() || 'Nombre del plato'}
              </Text>
              <Text style={[s.previewMeta, { color: colors.secondaryLabel }]} numberOfLines={1}>
                {cat || 'Categoría'} · {servings} porciones
              </Text>
              <View style={s.previewStatsRow}>
                <Text style={[s.previewPrice, { color: colors.systemBlue }]}>${(basePrice || suggestedPrice || 0).toFixed(1)}</Text>
                <Text style={[s.previewKcal, { color: colors.secondaryLabel }]}>{nutrition.calories.toFixed(0)} kcal</Text>
              </View>
            </View>
          </View>

          {/* ── 7: Ingredientes ── */}
          <Text style={[s.sectionHeader, { color: colors.secondaryLabel }]}>INGREDIENTES</Text>
          <View style={[s.card, { backgroundColor: colors.cardBg }]}>
            {ingredients.map((item, idx) => {
              const kcal = (Number(item.grams) / 100) * Number(item.caloriesPer100g ?? 0);
              return (
                <Swipeable
                  key={item.id}
                  friction={2}
                  rightThreshold={40}
                  renderRightActions={() => (
                    <Pressable
                      style={[s.swipeDelete, { backgroundColor: colors.systemRed }]}
                      onPress={async () => {
                        setIngredients((prev) => prev.filter((i) => i.id !== item.id));
                        markDirty();
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }}
                    >
                      <Text style={s.swipeDeleteText}>Eliminar</Text>
                    </Pressable>
                  )}
                >
                  <View style={[s.row, { backgroundColor: colors.cardBg }, idx > 0 && rowSep(colors.separator)]}>
                    <View style={[s.ingredientDot, { backgroundColor: colors.systemGreen }]} />
                    <Text style={{ flex: 1, fontSize: 15, color: colors.label }} numberOfLines={1}>{item.name}</Text>
                    <Text style={{ fontSize: 14, color: colors.secondaryLabel, marginRight: 6 }}>
                      {item.quantity > 0 ? `${item.quantity}${item.unit}` : `${item.grams.toFixed(0)}g`}
                    </Text>
                    {kcal > 0 && (
                      <View style={[s.kcalBadge, { backgroundColor: colors.tertiaryGroupedBg }]}>
                        <Text style={[s.kcalBadgeText, { color: colors.secondaryLabel }]}>{kcal.toFixed(0)} kcal</Text>
                      </View>
                    )}
                  </View>
                </Swipeable>
              );
            })}
            <Pressable
              style={[s.row, ingredients.length > 0 && rowSep(colors.separator)]}
              onPress={() => setShowIngredientModal(true)}
            >
              <View style={[s.addCircle, { backgroundColor: colors.systemBlue }]}>
                <Text style={s.addCircleText}>+</Text>
              </View>
              <Text style={{ fontSize: 15, color: colors.systemBlue }}>Agregar ingrediente</Text>
            </Pressable>
          </View>

          {/* ── 8: Resumen nutricional ── */}
          {hasNutrition && (
            <>
              <Text style={[s.sectionHeader, { color: colors.secondaryLabel }]}>NUTRICIÓN</Text>
              <View style={[s.card, { backgroundColor: colors.cardBg, paddingHorizontal: 16, paddingVertical: 14 }]}>
                <Text style={{ fontSize: 13, color: colors.secondaryLabel, marginBottom: 10 }}>
                  Por porción ({servings} {servings === 1 ? 'porción' : 'porciones'})
                </Text>
                <View style={s.nutritionGrid}>
                  {[
                    { label: 'Calorías', value: nutrition.calories.toFixed(0), unit: 'kcal', color: colors.label },
                    { label: 'Proteínas', value: nutrition.protein.toFixed(1), unit: 'g', color: colors.systemGreen },
                    { label: 'Carbos', value: nutrition.carbs.toFixed(1), unit: 'g', color: colors.systemBlue },
                    { label: 'Grasas', value: nutrition.fat.toFixed(1), unit: 'g', color: colors.systemOrange },
                  ].map(({ label, value, unit: u, color }) => (
                    <View key={label} style={[s.nutritionCell, { backgroundColor: colors.tertiaryGroupedBg }]}>
                      <Text style={[s.nutritionValue, { color }]}>
                        {value}
                        <Text style={{ fontSize: 10, fontWeight: '400' }}> {u}</Text>
                      </Text>
                      <Text style={[s.nutritionLabel, { color: colors.secondaryLabel }]}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          <Text style={[s.sectionHeader, { color: colors.secondaryLabel }]}>RESUMEN FINAL</Text>
          <View style={[s.card, { backgroundColor: colors.cardBg }]}>
            <View style={s.row}>
              <Text style={[s.rowLabel, { color: colors.label }]}>Calorías por porción</Text>
              <Text style={[s.rowInputRight, { color: colors.label }]}>{nutrition.calories.toFixed(0)} kcal</Text>
            </View>
            <View style={[s.row, rowSep(colors.separator)]}>
              <Text style={[s.rowLabel, { color: colors.label }]}>Costo estimado</Text>
              <Text style={[s.rowInputRight, { color: colors.secondaryLabel }]}>${costPerServing.toFixed(2)}</Text>
            </View>
            <View style={[s.row, rowSep(colors.separator)]}>
              <Text style={[s.rowLabel, { color: colors.label }]}>Precio sugerido</Text>
              <Text style={[s.rowInputRight, { color: colors.systemBlue, fontWeight: '700' }]}>${suggestedPrice.toFixed(2)}</Text>
            </View>
          </View>

          {/* ── 9: Preparación ── */}
          <Text style={[s.sectionHeader, { color: colors.secondaryLabel }]}>PREPARACIÓN</Text>
          <View style={[s.card, { backgroundColor: colors.cardBg }]}>
            {steps.map((step, idx) => (
              <Swipeable
                key={`step-${idx}`}
                friction={2}
                rightThreshold={40}
                renderRightActions={() => (
                  <Pressable
                    style={[s.swipeDelete, { backgroundColor: colors.systemRed }]}
                    onPress={async () => {
                      setSteps((prev) => prev.filter((_, i) => i !== idx));
                      markDirty();
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }}
                  >
                    <Text style={s.swipeDeleteText}>Eliminar</Text>
                  </Pressable>
                )}
              >
                <View style={[s.row, s.stepRow, { backgroundColor: colors.cardBg }, idx > 0 && rowSep(colors.separator)]}>
                  <View style={[s.stepCircle, { backgroundColor: colors.systemBlue }]}>
                    <Text style={s.stepCircleText}>{idx + 1}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, lineHeight: 20, color: colors.label }}>{step}</Text>
                </View>
              </Swipeable>
            ))}
            <Pressable
              style={[s.row, steps.length > 0 && rowSep(colors.separator)]}
              onPress={addStep}
            >
              <View style={[s.addCircle, { backgroundColor: colors.systemBlue }]}>
                <Text style={s.addCircleText}>+</Text>
              </View>
              <Text style={{ fontSize: 15, color: colors.systemBlue }}>Agregar paso</Text>
            </Pressable>
          </View>

          {/* ── 10: Visibilidad ── */}
          <Text style={[s.sectionHeader, { color: colors.secondaryLabel }]}>VISIBILIDAD</Text>
          <View style={[s.card, { backgroundColor: colors.cardBg }]}>
            <View style={[s.row, { minHeight: 62 }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: colors.label }}>Publicar para consumidores</Text>
                <Text style={{ fontSize: 12, color: colors.secondaryLabel, marginTop: 2 }}>
                  Visible en el menú de tus clientes
                </Text>
              </View>
              <Switch
                value={isPublished}
                onValueChange={async (val) => {
                  setIsPublished(val);
                  markDirty();
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ true: '#34C759', false: undefined }}
                thumbColor={colors.cardBg}
              />
            </View>
          </View>

          {/* ── 11: Acciones ── */}
          <Text style={[s.sectionHeader, { color: colors.secondaryLabel }]}>ACCIONES</Text>
          <View style={[s.actionsWrap, { marginHorizontal: 16 }]}>
            <Pressable
              onPress={() => void handleSave(true)}
              disabled={!canSave || isSaving}
              style={({ pressed }) => [
                s.saveButton,
                {
                  backgroundColor: canSave && !isSaving ? colors.systemBlue : colors.systemGray,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={s.saveButtonText}>
                {isSaving ? 'Guardando…' : 'Guardar y publicar'}
              </Text>
            </Pressable>

            <Pressable onPress={handleCancel} disabled={isSaving} style={s.cancelButton}>
              <Text style={[s.cancelButtonText, { color: colors.systemRed }]}>Cancelar</Text>
            </Pressable>
          </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <DescriptionModal
        visible={showDescriptionModal}
        value={description}
        onDone={(text) => { setDescription(text); markDirty(); setShowDescriptionModal(false); }}
        colors={colors}
      />

      <IngredientSearchModal
        visible={showIngredientModal}
        catalog={catalog}
        priceByIngredientId={priceByIngredientId}
        onAdd={(ingredient) => { setIngredients((prev) => [...prev, ingredient]); markDirty(); setShowIngredientModal(false); }}
        onClose={() => setShowIngredientModal(false)}
        colors={colors}
      />

      <AddStepModal
        visible={showAddStepModal}
        onAdd={(text) => { setSteps((prev) => [...prev, text]); markDirty(); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        onClose={() => setShowAddStepModal(false)}
        colors={colors}
      />
    </>
  );
}

export default function RecipeFormRoute() {
  return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  toastWrap: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    zIndex: 50,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: 'rgba(28,28,30,0.92)',
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 34,
    justifyContent: 'center',
  },
  toastText: {
    color: lightTheme.colors.card,
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  actionsWrap: {
    marginTop: 4,
  },
  saveButton: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: lightTheme.colors.card,
    fontSize: 17,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 10,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Photo
  photoHero: {
    height: 180,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoOverlayText: {
    fontSize: 11,
    fontWeight: '500',
    color: lightTheme.colors.label,
  },
  photoPlaceholder: {
    alignItems: 'center',
    gap: 4,
  },
  photoPlaceholderMain: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  photoPlaceholderSub: {
    fontSize: 12,
    marginTop: 4,
  },

  // Sections
  sectionHeader: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 6,
    textTransform: 'uppercase',
  },

  // Cards
  card: {
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },

  // Rows
  row: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  rowLabel: {
    fontSize: 15,
    minWidth: 90,
  },
  rowInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
  },
  rowInputRight: {
    flex: 1,
    fontSize: 15,
    textAlign: 'right',
  },
  priceInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  priceCurrency: {
    fontSize: 24,
    fontWeight: '700',
    marginRight: 4,
  },
  priceInput: {
    minWidth: 90,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
    textAlign: 'right',
    paddingVertical: 0,
  },
  priceSuffix: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  stepRow: {
    minHeight: 54,
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  previewCard: {
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  previewBody: {
    padding: 12,
  },
  previewName: {
    fontSize: 19,
    fontWeight: '700',
  },
  previewMeta: {
    marginTop: 2,
    fontSize: 13,
  },
  previewStatsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewPrice: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  previewKcal: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Chips
  chipsScrollRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Ingredients
  ingredientDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  kcalBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  kcalBadgeText: {
    fontSize: 11,
  },

  // Add row
  addCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCircleText: {
    color: lightTheme.colors.card,
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 22,
  },

  // Steps
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  stepCircleText: {
    color: lightTheme.colors.card,
    fontSize: 12,
    fontWeight: '600',
  },

  // Swipe delete
  swipeDelete: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    width: 80,
  },
  swipeDeleteText: {
    color: lightTheme.colors.card,
    fontSize: 14,
    fontWeight: '600',
  },

  // Nutrition
  nutritionGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  nutritionCell: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  nutritionLabel: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },

  // Modals
  modalHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalHeaderSide: {
    minWidth: 70,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  bigTextInput: {
    flex: 1,
    fontSize: 16,
    padding: 16,
    textAlignVertical: 'top',
  },

  // Ingredient modal
  suggestionLoading: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    padding: 16,
    textAlign: 'center',
  },
});
