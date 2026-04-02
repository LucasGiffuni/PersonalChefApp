import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Platform,
  PlatformColor,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { useConsumerStore } from '../../../lib/stores/consumerStore';

function iosColor(name: string, fallback: string) {
  return Platform.OS === 'ios' ? PlatformColor(name) : fallback;
}

type CategoryChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function CategoryChip({ label, active, onPress }: CategoryChipProps) {
  const isDark = useColorScheme() === 'dark';
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active
            ? iosColor('systemBlue', '#007AFF')
            : iosColor('secondarySystemBackground', isDark ? '#1C1C1E' : '#F2F2F7'),
        },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? '#FFFFFF' : iosColor('label', isDark ? '#FFF' : '#000') }]}>{label}</Text>
    </Pressable>
  );
}

export default function ConsumerMenuScreen() {
  const isDark = useColorScheme() === 'dark';
  const router = useRouter();
  const recipes = useConsumerStore((s) => s.recipes);
  const chefName = useConsumerStore((s) => s.chefName);
  const planItems = useConsumerStore((s) => s.planItems);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('Todas');
  const scrollY = useRef(new Animated.Value(0)).current;

  const categories = useMemo(() => {
    const base = ['Todas'];
    const fromRecipes = Array.from(new Set(recipes.map((r) => r.cat).filter(Boolean))) as string[];
    return [...base, ...fromRecipes];
  }, [recipes]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return recipes.filter((recipe) => {
      const matchesCategory = category === 'Todas' || recipe.cat === category;
      if (!matchesCategory) return false;
      if (!normalized) return true;
      return recipe.name.toLowerCase().includes(normalized);
    });
  }, [category, query, recipes]);

  const inWeekRecipeIds = useMemo(() => new Set(planItems.map((i) => i.recipe_id)), [planItems]);

  const collapsedTitleOpacity = scrollY.interpolate({
    inputRange: [0, 36, 64],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const largeTitleOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: iosColor('systemBackground', isDark ? '#000' : '#FFF') }]}>
      <Animated.View
        style={[
          styles.inlineHeader,
          {
            backgroundColor: iosColor('systemBackground', isDark ? '#000' : '#FFF'),
            borderBottomColor: iosColor('separator', isDark ? '#3A3A3C' : '#C6C6C8'),
            opacity: collapsedTitleOpacity,
          },
        ]}
      >
        <Text style={[styles.inlineTitle, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>
          Menú de {chefName ?? 'tu chef'}
        </Text>
      </Animated.View>

      <Animated.FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.column}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <View>
            <Animated.Text style={[styles.largeTitle, { color: iosColor('label', isDark ? '#FFF' : '#000'), opacity: largeTitleOpacity }]}>
              Menú de {chefName ?? 'tu chef'}
            </Animated.Text>

            <View style={[styles.searchWrap, { backgroundColor: iosColor('secondarySystemBackground', isDark ? '#1C1C1E' : '#F2F2F7') }]}>
              <Ionicons name="search" size={16} color={iosColor('secondaryLabel', '#8E8E93')} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar recetas"
                placeholderTextColor={iosColor('tertiaryLabel', '#8E8E93')}
                style={[styles.searchInput, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}
              />
            </View>

            <FlatList
              horizontal
              data={categories}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsWrap}
              renderItem={({ item }) => (
                <CategoryChip
                  label={item}
                  active={item === category}
                  onPress={async () => {
                    setCategory(item);
                    await Haptics.selectionAsync();
                  }}
                />
              )}
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={[styles.emptyTitle, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>
              Tu chef aún no publicó recetas
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const inWeek = inWeekRecipeIds.has(item.id);
          return (
            <Pressable style={styles.card} onPress={() => router.push(`/(consumer)/menu/${item.id}`)}>
              {item.photo_url ? (
                <Image source={{ uri: item.photo_url }} style={styles.cardImage} resizeMode="cover" />
              ) : (
                <View
                  style={[
                    styles.cardImageFallback,
                    { backgroundColor: iosColor('tertiarySystemBackground', isDark ? '#2C2C2E' : '#FFFFFF') },
                  ]}
                >
                  <Text style={styles.fallbackEmoji}>{item.emoji || '🍽️'}</Text>
                </View>
              )}

              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: iosColor('label', isDark ? '#FFF' : '#000') }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={[styles.cardCategory, { color: iosColor('secondaryLabel', '#8E8E93') }]} numberOfLines={1}>
                  {item.cat || 'Sin categoría'}
                </Text>
                {inWeek ? (
                  <View style={[styles.badge, { backgroundColor: iosColor('systemGreen', '#34C759') }]}>
                    <Ionicons name="checkmark" size={12} color="#FFF" />
                    <Text style={styles.badgeText}>En mi semana</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  inlineHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inlineTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 120,
    paddingHorizontal: 16,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 10,
  },
  searchWrap: {
    minHeight: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    minHeight: 40,
  },
  chipsWrap: {
    paddingVertical: 12,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  column: {
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    marginBottom: 14,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  cardImageFallback: {
    width: '100%',
    aspectRatio: 4 / 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackEmoji: {
    fontSize: 34,
  },
  cardBody: {
    paddingTop: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardCategory: {
    fontSize: 12,
    marginTop: 3,
  },
  badge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 8,
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyWrap: {
    marginTop: 80,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
});
