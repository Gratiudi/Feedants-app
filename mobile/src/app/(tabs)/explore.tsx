import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { API_BASE_URL } from '@/config/api';

type Competition = {
  _id: string;
  title: string;
  description?: string;
  tags?: string[];
  prizePool?: number;
  entryFee?: number;
  registerBefore?: string;
  totalSpots?: number;
  spotsBooked?: number;
};

const colors = { ink: '#12231f', muted: '#71817a', green: '#176b53', canvas: '#f5f7f2', border: '#e4e9e2', white: '#fff' };

async function fetchCompetitions(): Promise<Competition[]> {
  const response = await fetch(`${API_BASE_URL}/api/competitions`);
  const data: unknown = await response.json();
  if (!response.ok || !Array.isArray(data)) {
    throw new Error('Unable to load competitions. Please try again.');
  }
  return data as Competition[];
}

export default function ExploreScreen() {
  const [items, setItems] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      setItems(await fetchCompetitions());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load competitions.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchCompetitions()
      .then((data) => { if (active) setItems(data); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load competitions.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const categories = useMemo(
    () => ['All', ...new Set(items.flatMap((item) => item.tags ?? []).filter(Boolean))],
    [items],
  );
  const visibleItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    return items.filter((item) =>
      (category === 'All' || item.tags?.includes(category)) &&
      (!search || `${item.title} ${item.description ?? ''} ${(item.tags ?? []).join(' ')}`.toLowerCase().includes(search)),
    );
  }, [items, query, category]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.green} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <View style={styles.topline}><Text style={styles.brand}>feedants <Text style={styles.brandDot}>/</Text> discover</Text><Text style={styles.count}>{items.length} OPPORTUNITIES</Text></View>
            <Text style={styles.kicker}>THE OPEN CALL DIRECTORY</Text>
            <Text style={styles.heading}>Find the stage{"\n"}that fits you.</Text>
            <Text style={styles.intro}>Browse opportunities across music, dance, and visual arts. Search by discipline or find something unexpected.</Text>
            <View style={styles.search}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                accessibilityLabel="Search opportunities"
                placeholder="What are you looking for?"
                placeholderTextColor="#8c9992"
                value={query}
                onChangeText={setQuery}
                style={styles.searchInput}
              />
              {query.length > 0 && <Pressable onPress={() => setQuery('')} accessibilityLabel="Clear search"><Text style={styles.clear}>×</Text></Pressable>}
            </View>
            <Text style={styles.filterHeading}>EXPLORE BY CATEGORY</Text>
            <FlatList
              horizontal
              data={categories}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categories}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: category === item }}
                  onPress={() => setCategory(item)}
                  style={[styles.category, category === item && styles.categorySelected]}>
                  <Text style={[styles.categoryText, category === item && styles.categoryTextSelected]}>{item}</Text>
                </Pressable>
              )}
            />
            <View style={styles.resultsHeading}>
              <Text style={styles.resultsTitle}>{category === 'All' ? 'All opportunities' : category}</Text>
              <Text style={styles.resultsCount}>{visibleItems.length} found</Text>
            </View>
            {error.length > 0 && items.length > 0 && (
              <View style={styles.refreshWarning}>
                <Text style={styles.refreshWarningText}>{error}</Text>
                <Pressable onPress={() => void refresh()} accessibilityRole="button">
                  <Text style={styles.refreshWarningAction}>Retry</Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${item.title}`}
            onPress={() => router.push({ pathname: '/competition/[id]', params: { id: item._id } })}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
            <View style={styles.cardTop}>
              <Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text>
              <View style={styles.categoryPills}>
                {(item.tags ?? []).slice(0, 2).map((tag) => <Text style={styles.tag} key={tag}>{tag}</Text>)}
              </View>
              <Text style={styles.arrow}>↗</Text>
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDescription} numberOfLines={2}>{item.description || 'Competition details coming soon.'}</Text>
            <View style={styles.cardBottom}>
              <View><Text style={styles.meta}>PRIZE POOL</Text><Text style={styles.value}>{(item.prizePool ?? 0).toLocaleString()} ETB</Text></View>
              <View style={styles.separator} />
              <View><Text style={styles.meta}>ENTRY FEE</Text><Text style={styles.value}>{(item.entryFee ?? 0).toLocaleString()} ETB</Text></View>
              <View style={styles.spots}><Text style={styles.spotValue}>{typeof item.totalSpots === 'number' ? Math.max(item.totalSpots - (item.spotsBooked ?? 0), 0) : '—'}</Text><Text style={styles.meta}>SPOTS LEFT</Text></View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? <ActivityIndicator color={colors.green} /> : (
              <>
                <Text style={styles.emptyTitle}>{error ? 'Could not load opportunities' : query ? 'No matches this time' : 'Nothing in this category yet'}</Text>
                <Text style={styles.emptyText}>{error || (query ? 'Try adjusting your search or category.' : 'Explore another discipline or check back later.')}</Text>
                {(error || query || category !== 'All') && <Pressable style={styles.reset} onPress={() => { setQuery(''); setCategory('All'); if (error) void refresh(); }}><Text style={styles.resetText}>{error ? 'Try again' : 'Clear filters'}</Text></Pressable>}
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingBottom: Platform.OS === 'web' ? 100 : 32 },
  topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18 },
  brand: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  brandDot: { color: colors.green },
  count: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  kicker: { color: colors.green, fontWeight: '800', fontSize: 10, letterSpacing: 1.8, marginTop: 16 },
  heading: { color: colors.ink, fontSize: 37, lineHeight: 42, fontWeight: '800', letterSpacing: -1.4, marginTop: 8 },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 12, maxWidth: 350 },
  search: { marginTop: 22, height: 52, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  searchIcon: { color: colors.green, fontSize: 24, marginRight: 9 },
  searchInput: { flex: 1, color: colors.ink, fontSize: 14, paddingVertical: 12 },
  clear: { color: colors.muted, fontSize: 22, paddingHorizontal: 5 },
  filterHeading: { color: colors.muted, fontSize: 9, letterSpacing: 1.2, fontWeight: '800', marginTop: 24, marginBottom: 10 },
  categories: { gap: 8, paddingBottom: 12 },
  category: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  categorySelected: { backgroundColor: colors.green, borderColor: colors.green },
  categoryText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  categoryTextSelected: { color: colors.white },
  resultsHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 13 },
  resultsTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  resultsCount: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  refreshWarning: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 11, marginBottom: 12, backgroundColor: '#fff5e4', borderRadius: 12 },
  refreshWarningText: { flex: 1, color: '#765b2e', fontSize: 10 },
  refreshWarningAction: { color: '#765b2e', fontSize: 10, fontWeight: '800' },
  card: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 18, marginBottom: 12 },
  cardPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  index: { color: colors.green, fontSize: 11, fontWeight: '800' },
  categoryPills: { flex: 1, flexDirection: 'row', gap: 6 },
  tag: { color: colors.green, backgroundColor: '#eef5ef', overflow: 'hidden', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4, fontSize: 9, fontWeight: '700' },
  arrow: { color: colors.green, fontSize: 17 },
  cardTitle: { color: colors.ink, fontSize: 18, lineHeight: 24, fontWeight: '800', marginTop: 14 },
  cardDescription: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 13, borderTopWidth: 1, borderTopColor: '#edf0eb', paddingTop: 12, marginTop: 14 },
  meta: { color: '#87938c', fontSize: 8, letterSpacing: 0.8, fontWeight: '800' },
  value: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 3 },
  separator: { width: 1, height: 27, backgroundColor: colors.border },
  spots: { flex: 1, alignItems: 'flex-end' },
  spotValue: { color: colors.ink, fontSize: 13, fontWeight: '800', marginBottom: 3 },
  empty: { minHeight: 150, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 22 },
  emptyTitle: { color: colors.ink, fontWeight: '800', fontSize: 16, textAlign: 'center' },
  emptyText: { color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 7 },
  reset: { backgroundColor: colors.green, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9, marginTop: 13 },
  resetText: { color: colors.white, fontSize: 11, fontWeight: '700' },
});
