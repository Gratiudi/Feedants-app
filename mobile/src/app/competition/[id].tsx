import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL } from '@/config/api';
import { useAuth } from '@/context/AuthContext';

type Judge = {
  name?: string;
  title?: string;
  bio?: string;
  photoUrl?: string;
  introVideoUrl?: string;
  yearsOfExperience?: number;
};

type Competition = {
  _id: string;
  title: string;
  description?: string;
  tags?: string[];
  prizePool?: number;
  entryFee?: number;
  totalSpots?: number;
  spotsBooked?: number;
  judgeId?: Judge;
  registerBefore?: string;
  submissionStart?: string;
  submissionEnd?: string;
  resultDate?: string;
  rewards?: { position: number; amount: number }[];
  judgingParameters?: string;
  rulesAndEligibility?: string;
  refundPolicy?: string;
};

type Winner = {
  userId: { name?: string } | string;
  position: number;
  prizeAwarded: number;
};

type CompetitionResult = { winners: Winner[]; announcedAt?: string };
type DetailTab = 'Overview' | 'Judging' | 'Guidelines';
type CompetitionResponse = { competition: Competition; buttonText: string };

const colors = {
  ink: '#12231f',
  muted: '#71817a',
  green: '#176b53',
  canvas: '#f5f7f2',
  border: '#e4e9e2',
  white: '#ffffff',
};
const cloudinaryCloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
const cloudinaryUploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

function money(amount?: number) {
  return `${(amount ?? 0).toLocaleString()} ETB`;
}

function dateLabel(value?: string) {
  if (!value) return 'To be announced';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'To be announced'
    : date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
}

async function responseMessage(response: Response, fallback: string) {
  try {
    const body = await response.json();
    return typeof body.message === 'string' ? body.message : fallback;
  } catch {
    return fallback;
  }
}

async function fetchCompetitionData(id: string | undefined, token: string | null): Promise<CompetitionResponse> {
  if (!id) throw new Error('This competition link is incomplete.');
  const response = await fetch(`${API_BASE_URL}/api/competitions/${encodeURIComponent(id)}`);
  if (!response.ok) {
    throw new Error(await responseMessage(response, 'Unable to load this competition.'));
  }
  const competition: Competition = await response.json();
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const stateResponse = await fetch(
    `${API_BASE_URL}/api/competitions/${encodeURIComponent(competition._id)}/state`,
    { headers },
  );
  if (!stateResponse.ok) {
    throw new Error(await responseMessage(stateResponse, 'Unable to load competition status.'));
  }
  const stateData: { buttonText?: string } = await stateResponse.json();
  const buttonText = stateData.buttonText === 'Pay & Register' ? 'Register' : stateData.buttonText;
  return { competition, buttonText: buttonText || 'Explore opportunity' };
}

export default function CompetitionDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { token } = useAuth();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [buttonText, setButtonText] = useState('Explore opportunity');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<DetailTab>('Overview');
  const [expanded, setExpanded] = useState(false);
  const [processingRegistration, setProcessingRegistration] = useState(false);
  const [processingUpload, setProcessingUpload] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [result, setResult] = useState<CompetitionResult | null>(null);
  const [resultMessage, setResultMessage] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [loadingResult, setLoadingResult] = useState(false);

  useEffect(() => {
    let active = true;
    fetchCompetitionData(id, token)
      .then(({ competition: item, buttonText: nextButtonText }) => {
        if (active) {
          setCompetition(item);
          setButtonText(nextButtonText);
          setError('');
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load this competition.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, token]);

  const retryCompetition = () => {
    setLoading(true);
    setError('');
    fetchCompetitionData(id, token)
      .then(({ competition: item, buttonText: nextButtonText }) => {
        setCompetition(item);
        setButtonText(nextButtonText);
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load this competition.');
      })
      .finally(() => setLoading(false));
  };

  const tabs: DetailTab[] = ['Overview', 'Judging', 'Guidelines'];
  const content = useMemo(() => {
    if (!competition) return '';
    if (activeTab === 'Judging') {
      return competition.judgingParameters || 'Judging criteria will be announced by the organizers.';
    }
    if (activeTab === 'Guidelines') {
      return competition.rulesAndEligibility || 'Eligibility and submission guidelines will be announced by the organizers.';
    }
    return competition.description || 'Competition details will be announced by the organizers.';
  }, [activeTab, competition]);

  const openResults = async () => {
    if (!competition) return;
    setShowResults(true);
    setLoadingResult(true);
    setResultMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/competitions/${encodeURIComponent(competition._id)}/results`);
      if (!response.ok) {
        throw new Error(await responseMessage(response, 'Results are not available yet.'));
      }
      setResult(await response.json());
    } catch (resultError) {
      setResult(null);
      setResultMessage(resultError instanceof Error ? resultError.message : 'Unable to load results.');
    } finally {
      setLoadingResult(false);
    }
  };

  const registerForCompetition = async () => {
    if (!competition || !token) return;
    setProcessingRegistration(true);
    setActionMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/competitions/${encodeURIComponent(competition._id)}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        throw new Error(await responseMessage(response, 'Unable to register for this competition.'));
      }
      setActionMessage('You are registered. No payment is collected.');
      try {
        const refreshed = await fetchCompetitionData(id, token);
        setCompetition(refreshed.competition);
        setButtonText(refreshed.buttonText);
      } catch {
        setButtonText('Registered');
        setActionMessage('You are registered, but competition status could not be refreshed. Reopen this competition to continue.');
      }
    } catch (registrationError) {
      setActionMessage(registrationError instanceof Error ? registrationError.message : 'Unable to register for this competition.');
    } finally {
      setProcessingRegistration(false);
    }
  };

  const uploadSubmission = async () => {
    if (!competition || !token) return;
    setActionMessage('');
    setProcessingUpload(true);
    if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
      setActionMessage('Video uploads need Cloudinary settings. Set the public cloud name and unsigned upload preset in mobile/.env.');
      setProcessingUpload(false);
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Allow photo library access to choose a performance video.');
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 1,
        videoMaxDuration: 600,
      });
      if (pickerResult.canceled) return;
      const asset = pickerResult.assets[0];
      if (!asset) throw new Error('No video was selected.');
      if (asset.fileSize && asset.fileSize > 100 * 1024 * 1024) {
        throw new Error('Choose a video smaller than 100 MB.');
      }

      const formData = new FormData();
      if (Platform.OS === 'web') {
        const fileResponse = await fetch(asset.uri);
        if (!fileResponse.ok) throw new Error('Unable to read the selected video.');
        const videoBlob = await fileResponse.blob();
        formData.append('file', videoBlob, asset.fileName || 'performance-video.mp4');
      } else {
        formData.append('file', {
          uri: asset.uri,
          type: asset.mimeType || 'video/mp4',
          name: asset.fileName || 'performance-video.mp4',
        } as unknown as Blob);
      }
      formData.append('upload_preset', cloudinaryUploadPreset);

      const cloudinaryResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryCloudName)}/video/upload`,
        { method: 'POST', body: formData },
      );
      const uploadData: { secure_url?: string; error?: { message?: string } } = await cloudinaryResponse.json();
      if (!cloudinaryResponse.ok || !uploadData.secure_url) {
        throw new Error(uploadData.error?.message || 'Cloudinary could not upload this video.');
      }

      const submissionResponse = await fetch(`${API_BASE_URL}/api/competitions/${encodeURIComponent(competition._id)}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileUrl: uploadData.secure_url }),
      });
      if (!submissionResponse.ok) {
        throw new Error(await responseMessage(submissionResponse, 'The video uploaded but could not be attached to this entry.'));
      }

      setActionMessage('Your performance was uploaded successfully.');
      try {
        const refreshed = await fetchCompetitionData(id, token);
        setCompetition(refreshed.competition);
        setButtonText(refreshed.buttonText);
      } catch {
        setButtonText('Submitted — Registered');
        setActionMessage('Your performance was uploaded successfully. Competition status could not be refreshed.');
      }
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Unable to upload this performance.';
      setActionMessage(message);
      if (Platform.OS === 'web') window.alert(message);
      else if (message !== 'Allow photo library access to choose a performance video.') Alert.alert('Upload failed', message);
    } finally {
      setProcessingUpload(false);
    }
  };

  const handleAction = () => {
    if (!competition) return;
    if (!token) {
      router.push('/auth/login');
      return;
    }
    if (buttonText === 'Register' || buttonText === 'Pay & Register') {
      void registerForCompetition();
    } else if (buttonText === 'Upload Submission') {
      void uploadSubmission();
    } else if (buttonText === 'View Results') {
      void openResults();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.green} />
        <Text style={styles.loadingText}>Loading opportunity…</Text>
      </SafeAreaView>
    );
  }

  if (error || !competition) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorTitle}>This opportunity isn’t available</Text>
        <Text style={styles.errorText}>{error || 'Try again in a moment.'}</Text>
        <Pressable onPress={retryCompetition} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Try again</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const judgeName = competition.judgeId?.name;
  const spotsLeft =
    typeof competition.totalSpots === 'number'
      ? Math.max(competition.totalSpots - (competition.spotsBooked ?? 0), 0)
      : null;
  const canRegister = buttonText === 'Register' || buttonText === 'Pay & Register';
  const canAct = canRegister || buttonText === 'Upload Submission' || buttonText === 'View Results';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.navigation}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={styles.backCircle}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{competition.tags?.slice(0, 2).join('  ·  ') || 'OPEN CALL'}</Text>
          <Text style={styles.title}>{competition.title}</Text>
          <Text style={styles.heroCopy}>A place for your next great performance.</Text>
          <View style={styles.heroMetrics}>
            <View><Text style={styles.heroMetricLabel}>PRIZE POOL</Text><Text style={styles.heroMetricValue}>{money(competition.prizePool)}</Text></View>
            <View style={styles.metricDivider} />
            <View><Text style={styles.heroMetricLabel}>ENTRY FEE</Text><Text style={styles.heroMetricValue}>{money(competition.entryFee)}</Text></View>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{buttonText}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key dates</Text>
          <View style={styles.dateCard}>
            <DateRow label="Registration closes" value={dateLabel(competition.registerBefore)} />
            <DateRow label="Submissions open" value={dateLabel(competition.submissionStart)} />
            <DateRow label="Submission deadline" value={dateLabel(competition.submissionEnd)} />
            <DateRow label="Results announced" value={dateLabel(competition.resultDate)} last />
          </View>
        </View>

        {judgeName && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meet your judge</Text>
            <View style={styles.judgeCard}>
              {competition.judgeId?.photoUrl ? (
                <Image source={{ uri: competition.judgeId.photoUrl }} style={styles.judgePhoto} />
              ) : (
                <View style={styles.judgeInitial}><Text style={styles.judgeInitialText}>{judgeName.slice(0, 1).toUpperCase()}</Text></View>
              )}
              <View style={styles.judgeInfo}>
                <Text style={styles.judgeName}>{judgeName}</Text>
                {!!competition.judgeId?.title && <Text style={styles.judgeTitle}>{competition.judgeId.title}</Text>}
                {!!competition.judgeId?.yearsOfExperience && <Text style={styles.judgeExperience}>{competition.judgeId.yearsOfExperience} years of experience</Text>}
              </View>
            </View>
            {!!competition.judgeId?.bio && <Text style={styles.judgeBio}>{competition.judgeId.bio}</Text>}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your opportunity</Text>
          {spotsLeft !== null && (
            <View style={styles.spotsCard}>
              <View style={styles.spotsTop}><Text style={styles.spotsCount}>{spotsLeft}</Text><Text style={styles.spotsCaption}>spots available</Text></View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${competition.totalSpots ? Math.min(((competition.spotsBooked ?? 0) / competition.totalSpots) * 100, 100) : 0}%` }]} />
              </View>
              <Text style={styles.progressCaption}>{competition.spotsBooked ?? 0} of {competition.totalSpots} spots filled</Text>
            </View>
          )}
          <View style={styles.tabs}>
            {tabs.map((tab) => (
              <Pressable
                key={tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === tab }}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, activeTab === tab && styles.tabActive]}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </Pressable>
            ))}
          </View>
          <Text numberOfLines={expanded ? undefined : 5} style={styles.bodyText}>{content}</Text>
          {content.length > 200 && (
            <Pressable onPress={() => setExpanded((value) => !value)} accessibilityRole="button">
              <Text style={styles.readMore}>{expanded ? 'Show less' : 'Read more'}</Text>
            </Pressable>
          )}
        </View>

        {!!competition.rewards?.length && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prizes</Text>
            <View style={styles.dateCard}>
              {competition.rewards.map((reward, index) => (
                <DateRow
                  key={`${reward.position}-${index}`}
                  label={`${reward.position}${reward.position === 1 ? 'st' : reward.position === 2 ? 'nd' : reward.position === 3 ? 'rd' : 'th'} place`}
                  value={money(reward.amount)}
                  last={index === (competition.rewards?.length ?? 0) - 1}
                />
              ))}
            </View>
          </View>
        )}

        {competition.refundPolicy && <Text style={styles.refundText}>Refund policy · {competition.refundPolicy}</Text>}
      </ScrollView>

      <View style={styles.actionDock}>
        {!token && <Text style={styles.loginHint}>Sign in to register and share your performance.</Text>}
        {!!actionMessage && <Text accessibilityRole="alert" style={styles.inlineMessage}>{actionMessage}</Text>}
        <Pressable
          accessibilityRole="button"
          disabled={processingRegistration || processingUpload || (!canAct && !!token)}
          onPress={handleAction}
          style={({ pressed }) => [styles.primaryButton, (processingRegistration || processingUpload || (!canAct && !!token)) && styles.disabledButton, pressed && canAct && styles.buttonPressed]}>
          {processingRegistration || processingUpload ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>{token ? buttonText : 'Sign in to continue'}</Text>}
          {canAct && !processingRegistration && !processingUpload && <Text style={styles.buttonArrow}>→</Text>}
        </Pressable>
        {canRegister && <Text style={styles.dockNote}>No payment is collected.</Text>}
      </View>

      <Modal visible={showResults} animationType="fade" transparent onRequestClose={() => { setShowResults(false); setResult(null); setResultMessage(''); }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View><Text style={styles.modalKicker}>COMPETITION UPDATE</Text><Text style={styles.modalTitle}>Results</Text></View>
              <Pressable onPress={() => { setShowResults(false); setResult(null); setResultMessage(''); }} accessibilityRole="button" accessibilityLabel="Close results" style={styles.modalClose}><Text style={styles.modalCloseText}>×</Text></Pressable>
            </View>
            {loadingResult ? <ActivityIndicator color={colors.green} /> : result ? (
              result.winners.length ? result.winners.map((winner) => (
                  <View key={`${winner.position}-${typeof winner.userId === 'string' ? winner.userId : winner.userId.name}`} style={styles.resultRow}>
                    <Text style={styles.resultPlace}>{winner.position}{winner.position === 1 ? 'st' : winner.position === 2 ? 'nd' : winner.position === 3 ? 'rd' : 'th'}</Text>
                    <Text style={styles.resultName}>{typeof winner.userId === 'string' ? 'Participant' : winner.userId.name || 'Participant'}</Text>
                    <Text style={styles.resultPrize}>{money(winner.prizeAwarded)}</Text>
                  </View>
                )) : <Text style={styles.disclaimer}>Results have not been announced yet.</Text>
            ) : <Text style={styles.disclaimer}>{resultMessage}</Text>}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DateRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.dateRow, last && styles.dateRowLast]}>
      <View style={styles.dateDot} />
      <Text style={styles.dateLabel}>{label}</Text>
      <Text style={styles.dateValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingBottom: 28 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.canvas, padding: 28 },
  loadingText: { color: colors.muted, fontSize: 13, marginTop: 12 },
  errorTitle: { color: colors.ink, fontWeight: '800', fontSize: 21, textAlign: 'center' },
  errorText: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8, marginBottom: 14 },
  navigation: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  backCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: colors.ink, fontSize: 20 },
  hero: { backgroundColor: '#153d32', borderRadius: 25, padding: 22, marginTop: 7 },
  eyebrow: { color: '#b5dbc4', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: colors.white, fontSize: 29, lineHeight: 35, letterSpacing: -0.8, fontWeight: '800', marginTop: 13 },
  heroCopy: { color: '#d3e6dc', fontSize: 13, marginTop: 9 },
  heroMetrics: { flexDirection: 'row', alignItems: 'center', gap: 20, borderTopWidth: 1, borderTopColor: '#ffffff30', marginTop: 21, paddingTop: 17 },
  heroMetricLabel: { color: '#b5dbc4', fontSize: 9, fontWeight: '800', letterSpacing: 0.9 },
  heroMetricValue: { color: colors.white, fontSize: 17, fontWeight: '800', marginTop: 4 },
  metricDivider: { width: 1, height: 35, backgroundColor: '#ffffff30' },
  statusRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 15, backgroundColor: colors.white, padding: 14, marginTop: 13, borderWidth: 1, borderColor: colors.border },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#52a877', marginRight: 9 },
  statusText: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '700' },
  section: { marginTop: 25 },
  sectionTitle: { color: colors.ink, fontSize: 19, letterSpacing: -0.4, fontWeight: '800', marginBottom: 11 },
  dateCard: { backgroundColor: colors.white, borderRadius: 17, paddingHorizontal: 15, paddingVertical: 3, borderWidth: 1, borderColor: colors.border },
  dateRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#edf0eb', gap: 9 },
  dateRowLast: { borderBottomWidth: 0 },
  dateDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#80ad8c' },
  dateLabel: { flex: 1, color: colors.muted, fontSize: 11 },
  dateValue: { color: colors.ink, fontSize: 11, fontWeight: '700', textAlign: 'right', maxWidth: '55%' },
  judgeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 17, padding: 14, borderWidth: 1, borderColor: colors.border },
  judgePhoto: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#e6eee8' },
  judgeInitial: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#e6eee8', alignItems: 'center', justifyContent: 'center' },
  judgeInitialText: { color: colors.green, fontSize: 20, fontWeight: '800' },
  judgeInfo: { flex: 1 },
  judgeName: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  judgeTitle: { color: colors.muted, fontSize: 11, marginTop: 3 },
  judgeExperience: { color: colors.green, fontSize: 10, fontWeight: '700', marginTop: 5 },
  judgeBio: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 10, paddingHorizontal: 2 },
  spotsCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 15, marginBottom: 13 },
  spotsTop: { flexDirection: 'row', alignItems: 'baseline', gap: 7, marginBottom: 11 },
  spotsCount: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  spotsCaption: { color: colors.muted, fontSize: 11 },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: '#e9eee8', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#3e9670' },
  progressCaption: { color: colors.muted, fontSize: 9, marginTop: 7 },
  tabs: { flexDirection: 'row', backgroundColor: '#eaf0e9', borderRadius: 14, padding: 4, gap: 3 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 11 },
  tabActive: { backgroundColor: colors.white },
  tabText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  tabTextActive: { color: colors.green },
  bodyText: { color: '#475a51', fontSize: 13, lineHeight: 21, marginTop: 13 },
  readMore: { color: colors.green, fontSize: 11, fontWeight: '800', marginTop: 8 },
  refundText: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 14, marginBottom: 5 },
  actionDock: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  loginHint: { color: colors.muted, fontSize: 10, textAlign: 'center', marginBottom: 7 },
  inlineMessage: { color: colors.muted, fontSize: 10, textAlign: 'center', marginBottom: 7 },
  primaryButton: { minHeight: 50, backgroundColor: colors.green, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18, gap: 10 },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  buttonArrow: { color: colors.white, fontSize: 17 },
  disabledButton: { backgroundColor: '#aab8ad' },
  buttonPressed: { opacity: 0.86 },
  backButton: { padding: 12 },
  backButtonText: { color: colors.green, fontSize: 13, fontWeight: '700' },
  dockNote: { color: colors.muted, fontSize: 9, textAlign: 'center', marginTop: 7 },
  modalBackdrop: { flex: 1, backgroundColor: '#12231f99', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 30, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  modalKicker: { color: colors.green, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  modalTitle: { color: colors.ink, fontSize: 24, fontWeight: '800', letterSpacing: -0.7, marginTop: 4 },
  modalClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f0f3ef', alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { color: colors.ink, fontSize: 22, lineHeight: 25 },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 17, marginVertical: 16 },
  resultRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  resultPlace: { color: colors.green, fontSize: 11, fontWeight: '800', width: 38 },
  resultName: { color: colors.ink, flex: 1, fontSize: 12, fontWeight: '700' },
  resultPrize: { color: colors.ink, fontSize: 11, fontWeight: '800' },
});
