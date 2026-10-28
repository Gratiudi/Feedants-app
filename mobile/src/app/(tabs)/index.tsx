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
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/config/api';

type Competition = {
  _id: string;
  title: string;
  description?: string;
  prizePool?: number;
  entryFee?: number;
  tags?: string[];
  registerBefore?: string;
  totalSpots?: number;
  spotsBooked?: number;
};

const colors = {
  ink: '#12231f',
  muted: '#71817a',
  green: '#176b53',
  canvas: '#f5f7f2',
  border: '#e4e9e2',
  white: '#ffffff',
};

function money(amount?: number) {
  return `${(amount ?? 0).toLocaleString()} ETB`;
}

function dateLabel(value?: string) {
  if (!value) return 'Dates coming soon';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Dates coming soon'
    : `Deadline ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

async function fetchCompetitions(): Promise<Competition[]> {
  const response = await fetch(`${API_BASE_URL}/api/competitions`);
  const data: unknown = await response.json();
  if (!response.ok) throw new Error('We could not load competitions right now.');
  if (!Array.isArray(data)) throw new Error('The server returned an unexpected response.');
  return data as Competition[];
}

export default function HomeScreen() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [accountError, setAccountError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const { user, logout } = useAuth();

  const refreshCompetitions = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      setCompetitions(await fetchCompetitions());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load competitions.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchCompetitions()
      .then((data) => { if (active) setCompetitions(data); })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load competitions.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const tags = useMemo(
    () => ['All', ...new Set(competitions.flatMap((item) => item.tags ?? []).filter(Boolean))],
    [competitions],
  );
  const filteredCompetitions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return competitions.filter((item) => {
      const matchesTag = selectedTag === 'All' || item.tags?.includes(selectedTag);
      const matchesQuery =
        !normalizedQuery ||
        `${item.title} ${item.description ?? ''} ${(item.tags ?? []).join(' ')}`
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesTag && matchesQuery;
    });
  }, [competitions, query, selectedTag]);
  const openCompetition = (id: string) => {
    router.push({ pathname: '/competition/[id]', params: { id } });
  };

  const renderCompetition = ({ item }: { item: Competition }) => {
    const spotsLeft =
      typeof item.totalSpots === 'number'
        ? Math.max(item.totalSpots - (item.spotsBooked ?? 0), 0)
        : null;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${item.title}`}
        onPress={() => openCompetition(item._id)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        <View style={styles.cardTop}>
          <View style={styles.categoryMark}>
            <Text style={styles.categoryMarkText}>{item.tags?.[0]?.slice(0, 1).toUpperCase() ?? 'F'}</Text>
          </View>
          <Text style={styles.deadline}>{dateLabel(item.registerBefore)}</Text>
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {item.description || 'Details for this competition will be announced soon.'}
        </Text>
        <View style={styles.tagRow}>
          {(item.tags ?? []).slice(0, 3).map((tag) => (
            <Text key={tag} style={styles.cardTag}>{tag}</Text>
          ))}
        </View>
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.metaLabel}>PRIZE POOL</Text>
            <Text style={styles.prize}>{money(item.prizePool)}</Text>
          </View>
          <View style={styles.cardAction}>
            <Text style={styles.cardActionText}>Explore</Text>
            <Text style={styles.arrow}>↗</Text>
          </View>
        </View>
        {spotsLeft !== null && (
          <Text style={styles.spots}>{spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} available</Text>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredCompetitions}
        keyExtractor={(item) => item._id}
        renderItem={renderCompetition}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
          onRefresh={() => void refreshCompetitions()}
            tintColor={colors.green}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.brandRow}>
                <View style={styles.brandIcon}><Text style={styles.brandIconText}>F</Text></View>
                <Text style={styles.brand}>feedants</Text>
              </View>
              {user ? (
                <View style={styles.accountActions}>
                  <View style={styles.accountButton}>
                    <Text style={styles.accountInitial}>{user.name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setAccountError('');
                      void logout().catch(() => setAccountError('Unable to sign out. Please try again.'));
                    }}
                    style={styles.signInButton}>
                    <Text style={styles.signInText}>Sign out</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable accessibilityRole="button" onPress={() => router.push('/auth/login')} style={styles.signInButton}>
                  <Text style={styles.signInText}>Sign in</Text>
                </Pressable>
              )}
            </View>
            {accountError ? <Text style={styles.accountError}>{accountError}</Text> : null}
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>YOUR NEXT BIG MOMENT</Text>
              <Text style={styles.heroTitle}>
                {user ? `Welcome back, ${user.name.split(' ')[0]}.` : 'Where talent finds its stage.'}
              </Text>
              <Text style={styles.heroCopy}>
                Discover open calls, meet your next challenge, and show the world what you can do.
              </Text>
              <View style={styles.heroStats}>
                <View><Text style={styles.statValue}>{competitions.length}</Text><Text style={styles.statLabel}>COMPETITIONS</Text></View>
                <View style={styles.statDivider} />
                <View><Text style={styles.statValue}>One stage</Text><Text style={styles.statLabel}>ENDLESS TALENT</Text></View>
              </View>
            </View>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionEyebrow}>FIND YOUR FIT</Text>
                <Text style={styles.sectionTitle}>Explore competitions</Text>
              </View>
              <Pressable onPress={() => router.push('/(tabs)/explore')} accessibilityRole="button">
                <Text style={styles.viewAll}>Discover more ↗</Text>
              </Pressable>
            </View>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                accessibilityLabel="Search competitions"
                placeholder="Search by name, style, or category"
                placeholderTextColor="#8c9992"
                value={query}
                onChangeText={setQuery}
                style={styles.searchInput}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search">
                  <Text style={styles.clearSearch}>×</Text>
                </Pressable>
              )}
            </View>
            <FlatList
              horizontal
              data={tags}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterList}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedTag === item }}
                  onPress={() => setSelectedTag(item)}
                  style={[styles.filterChip, selectedTag === item && styles.filterChipActive]}>
                  <Text style={[styles.filterText, selectedTag === item && styles.filterTextActive]}>{item}</Text>
                </Pressable>
              )}
            />
            {error.length > 0 && competitions.length > 0 && (
              <View style={styles.refreshWarning}>
                <Text style={styles.refreshWarningText}>{error}</Text>
                <Pressable onPress={() => void refreshCompetitions()} accessibilityRole="button">
                  <Text style={styles.refreshWarningAction}>Retry</Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.stateBox}><ActivityIndicator color={colors.green} /><Text style={styles.stateText}>Finding your next stage…</Text></View>
          ) : error ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>We couldn’t connect</Text>
              <Text style={styles.stateText}>{error}</Text>
              <Pressable onPress={() => void refreshCompetitions()} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable>
            </View>
          ) : (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>{query || selectedTag !== 'All' ? 'No matching competitions' : 'New opportunities are on the way'}</Text>
              <Text style={styles.stateText}>{query || selectedTag !== 'All' ? 'Try another search or category.' : 'Check back soon for upcoming calls.'}</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  listContent: { paddingHorizontal: 20, paddingBottom: Platform.OS === 'web' ? 100 : 34 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandIcon: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  brandIconText: { color: colors.white, fontSize: 17, fontWeight: '800' },
  brand: { color: colors.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  accountButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#deede3', alignItems: 'center', justifyContent: 'center' },
  accountActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accountInitial: { color: colors.green, fontWeight: '800', fontSize: 16 },
  signInButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 9 },
  signInText: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  hero: { borderRadius: 26, backgroundColor: '#153d32', padding: 24, marginTop: 10, overflow: 'hidden' },
  eyebrow: { color: '#b5dbc4', fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  heroTitle: { color: colors.white, fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -1, marginTop: 14, maxWidth: 330 },
  heroCopy: { color: '#d3e6dc', fontSize: 14, lineHeight: 21, marginTop: 10, maxWidth: 320 },
  heroStats: { marginTop: 24, paddingTop: 17, borderTopWidth: 1, borderTopColor: '#ffffff30', flexDirection: 'row', alignItems: 'center', gap: 20 },
  statValue: { color: colors.white, fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#b5dbc4', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
  statDivider: { width: 1, height: 32, backgroundColor: '#ffffff30' },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 30, marginBottom: 15 },
  sectionEyebrow: { fontSize: 10, color: colors.green, fontWeight: '800', letterSpacing: 1.5 },
  sectionTitle: { color: colors.ink, fontSize: 23, fontWeight: '800', letterSpacing: -0.5, marginTop: 3 },
  viewAll: { color: colors.green, fontSize: 12, fontWeight: '700', paddingBottom: 4 },
  searchBox: { minHeight: 50, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  searchIcon: { color: colors.green, fontSize: 24, marginRight: 9 },
  searchInput: { flex: 1, color: colors.ink, fontSize: 14, paddingVertical: 12 },
  accountError: { color: '#a43e36', fontSize: 11, marginBottom: 8 },
  clearSearch: { color: colors.muted, fontSize: 22, paddingHorizontal: 5 },
  filterList: { gap: 8, paddingVertical: 14 },
  filterChip: { borderRadius: 20, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.green, borderColor: colors.green },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: colors.white },
  refreshWarning: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 11, marginBottom: 12, backgroundColor: '#fff5e4', borderRadius: 12 },
  refreshWarningText: { flex: 1, color: '#765b2e', fontSize: 10 },
  refreshWarningAction: { color: '#765b2e', fontSize: 10, fontWeight: '800' },
  card: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 18, marginBottom: 12 },
  cardPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  categoryMark: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#eaf3ec', alignItems: 'center', justifyContent: 'center' },
  categoryMarkText: { color: colors.green, fontWeight: '800', fontSize: 15 },
  deadline: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  cardTitle: { color: colors.ink, fontSize: 19, lineHeight: 25, fontWeight: '800', letterSpacing: -0.35 },
  cardDescription: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 7 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  cardTag: { color: colors.green, backgroundColor: '#eef5ef', overflow: 'hidden', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, fontSize: 10, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#edf0eb', paddingTop: 13, marginTop: 15 },
  metaLabel: { color: '#87938c', fontSize: 9, letterSpacing: 1, fontWeight: '800' },
  prize: { color: colors.ink, fontWeight: '800', fontSize: 17, marginTop: 3 },
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cardActionText: { color: colors.green, fontSize: 12, fontWeight: '800' },
  arrow: { color: colors.green, fontSize: 16 },
  spots: { color: colors.muted, fontSize: 10, marginTop: 10 },
  stateBox: { minHeight: 150, alignItems: 'center', justifyContent: 'center', padding: 22, gap: 9, backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  stateTitle: { color: colors.ink, fontWeight: '800', fontSize: 17, textAlign: 'center' },
  stateText: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 5 },
  retryButton: { backgroundColor: colors.green, paddingHorizontal: 17, paddingVertical: 10, borderRadius: 12, marginTop: 5 },
  retryText: { color: colors.white, fontWeight: '700', fontSize: 12 },
});
