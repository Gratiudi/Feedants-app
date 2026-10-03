import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';


type Winner = {
  name: string;
  position: string;
  color: string;
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
  judgeId?: {
    name?: string;
    title?: string;
    yearsOfExperience?: number;
    photoUrl?: string;
  };
  registerBefore?: string;
  submissionStart?: string;
  submissionEnd?: string;
  resultDate?: string;
  rewards?: Array<{ position: number; amount: number }>;
  judgingParameters?: string;
  rulesAndEligibility?: string;
  refundPolicy?: string;
};

const fallbackCompetition: Competition = {
  _id: "fallback",
  title: "Feedants Classical Dance",
  description:
    "This is an online classical dance competition open for all age groups. Participate from anywhere and showcase your talent. Express your passion through traditional dance.",
  tags: ["Dance", "Multi-Win", "Winners get certificate"],
  prizePool: 1500,
  entryFee: 99,
  totalSpots: 20,
  spotsBooked: 1,
  judgeId: {
    name: "Manju Dubey",
    title: "Professional Kathak Dancer",
    yearsOfExperience: 12,
    photoUrl: "",
  },
  registerBefore: "2026-08-10T23:55:00.000Z",
  submissionStart: "2026-08-06T04:00:00.000Z",
  submissionEnd: "2026-08-30T11:55:00.000Z",
  resultDate: "2026-09-01T23:55:00.000Z",
  rewards: [
    { position: 1, amount: 550 },
    { position: 2, amount: 300 },
    { position: 3, amount: 240 },
    { position: 4, amount: 200 },
    { position: 5, amount: 130 },
    { position: 6, amount: 80 },
  ],
  judgingParameters: "Technique, expression, rhythm, stage presence.",
  rulesAndEligibility:
    "Open to all. Participants must be registered and submit original performances.",
  refundPolicy: "Refunds are available only before registration closes.",
};

const winnerCards: Winner[] = [
  { name: "Riya Shah", position: "1st Winner", color: "#8d4dff" },
  { name: "Aarav Mehta", position: "1st Winner", color: "#f59e0b" },
  { name: "Neha Verma", position: "2nd Winner", color: "#34d399" },
  { name: "Ishita Chou", position: "3rd Winner", color: "#f87171" },
];

function formatCurrency(value?: number) {
  const amount = value ?? 0;
  return `₹ ${amount.toLocaleString("en-IN")}`;
}

function formatDateLabel(dateString?: string) {
  if (!dateString) return "TBD";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

function formatTime(dateString?: string) {
  if (!dateString) return "TBD";
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CompetitionDetailScreen() {
  const [competition, setCompetition] =
    useState<Competition>(fallbackCompetition);
  const [loading, setLoading] = useState(true);
  const [buttonText, setButtonText] = useState('Register');
  const { token } = useAuth();

  const fetchCompetition = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/competitions");
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        setCompetition(data[0]);
        if (token) {
          const stateRes = await fetch(`http://localhost:5000/api/competitions/${data[0]._id}/state`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const stateData = await stateRes.json();
          if (stateRes.ok) {
            setButtonText(stateData.buttonText || 'Register');
          }
        }
      }
    } catch (error) {
      console.error("Unable to load competition data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCompetition();
  }, [token]);

  const handleAction = async () => {
    if (!token) {
      Platform.OS === 'web' ? window.alert('Please log in first') : Alert.alert('Error', 'Please log in first');
      return;
    }

    if (buttonText === 'Register') {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:5000/api/competitions/${competition._id}/register`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({})
        });
        if (!res.ok) {
          const err = await res.json();
          Platform.OS === 'web' ? window.alert(err.message) : Alert.alert('Error', err.message || 'Registration failed');
        }
        await fetchCompetition();
      } catch (error) {
        Platform.OS === 'web' ? window.alert('Unable to register') : Alert.alert('Error', 'Unable to register');
      } finally {
        setLoading(false);
      }
    } else if (buttonText === 'Upload Submission') {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 1,
      });

      if (pickerResult.canceled) return;
      
      setLoading(true);
      const videoUri = pickerResult.assets[0].uri;

      try {
        const data = new FormData();
        data.append('file', {
          uri: videoUri,
          type: 'video/mp4',
          name: 'submission.mp4'
        } as any);
        data.append('upload_preset', 'avrzjqwo'); 
        data.append('cloud_name', 'jtuedsvv'); 

        const cloudinaryRes = await fetch('https://api.cloudinary.com/v1_1/jtuedsvv/video/upload', {
          method: 'POST',
          body: data,
        });

        const cloudinaryData = await cloudinaryRes.json();
        if (!cloudinaryRes.ok) throw new Error('Cloudinary Upload Failed');

        const secureVideoUrl = cloudinaryData.secure_url;

        const res = await fetch(`http://localhost:5000/api/competitions/${competition._id}/submissions`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ fileUrl: secureVideoUrl })
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Database Submission Failed');
        }

        Platform.OS === 'web' ? window.alert('Success! Your video has been submitted.') : Alert.alert('Success', 'Your video has been submitted!');
        await fetchCompetition();
      } catch (error: any) {
        Platform.OS === 'web' ? window.alert(error.message) : Alert.alert('Error', error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const rewardRows = competition.rewards ?? fallbackCompetition.rewards ?? [];
  const judgeName = competition.judgeId?.name ?? "Manju Dubey";
  const judgeTitle = competition.judgeId?.title ?? "Professional Kathak Dancer";
  const judgeYears = competition.judgeId?.yearsOfExperience ?? 12;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.topBar}>
            <Text style={styles.backText}>← Go back</Text>
            <View style={styles.langBadge}>
              <Text style={styles.langText}>ENG</Text>
            </View>
          </View>

          <View style={styles.titleRow}>
            <Text style={styles.title}>{competition.title}</Text>
            <View style={styles.registeredBadge}>
              <Text style={styles.registeredText}>✓ Registered</Text>
            </View>
          </View>

          <View style={styles.tagRow}>
            {competition.tags?.map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Prize Pool</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(competition.prizePool)}
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Entry Fee</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(competition.entryFee)}
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Spots Left</Text>
              <Text style={styles.metricValue}>
                {Math.max(
                  (competition.totalSpots ?? 0) -
                    (competition.spotsBooked ?? 0),
                  0,
                )}
              </Text>
            </View>
          </View>

          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(((competition.spotsBooked ?? 0) / (competition.totalSpots ?? 1)) * 100, 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressMeta}>
              {competition.spotsBooked ?? 0} / {competition.totalSpots ?? 0}{" "}
              Booked
            </Text>
          </View>

          <View style={styles.judgeCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {judgeName.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.judgeInfo}>
              <Text style={styles.smallLabel}>Judge</Text>
              <Text style={styles.judgeName}>{judgeName}</Text>
              <Text style={styles.judgeMeta}>{judgeTitle}</Text>
              <Text style={styles.judgeMeta}>
                {judgeYears} Years of Experience
              </Text>
            </View>
            <Pressable style={styles.videoButton}>
              <Text style={styles.videoIcon}>▶</Text>
              <Text style={styles.videoText}>Intro Video</Text>
            </Pressable>
          </View>

          <View style={styles.timerRow}>
            <View style={styles.timerItem}>
              <Text style={styles.timerIcon}>◫</Text>
              <Text style={styles.timerText}>Registration closes in</Text>
              <Text style={styles.timerStrong}>01d : 06h : 28m : 32s</Text>
            </View>
            <View style={styles.timerItemRight}>
              <Text style={styles.timerIcon}>◔</Text>
              <Text style={styles.timerText}>Hurry up!</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Important Dates</Text>
          <View style={styles.dateGrid}>
            <View style={styles.dateBox}>
              <Text style={styles.dateIcon}>🗓</Text>
              <Text style={styles.dateHeading}>Register Before</Text>
              <Text style={styles.dateValue}>
                {formatDateLabel(competition.registerBefore)}
              </Text>
              <Text style={styles.dateValue}>
                {formatTime(competition.registerBefore)}
              </Text>
            </View>
            <View style={styles.dateBox}>
              <Text style={styles.dateIcon}>✦</Text>
              <Text style={styles.dateHeading}>Submission Starts</Text>
              <Text style={styles.dateValue}>
                {formatDateLabel(competition.submissionStart)}
              </Text>
              <Text style={styles.dateValue}>
                {formatTime(competition.submissionStart)}
              </Text>
            </View>
            <View style={styles.dateBox}>
              <Text style={styles.dateIcon}>⇧</Text>
              <Text style={styles.dateHeading}>Submission Ends</Text>
              <Text style={styles.dateValue}>
                {formatDateLabel(competition.submissionEnd)}
              </Text>
              <Text style={styles.dateValue}>
                {formatTime(competition.submissionEnd)}
              </Text>
            </View>
            <View style={styles.dateBox}>
              <Text style={styles.dateIcon}>◔</Text>
              <Text style={styles.dateHeading}>Result Date</Text>
              <Text style={styles.dateValue}>
                {formatDateLabel(competition.resultDate)}
              </Text>
              <Text style={styles.dateValue}>
                {formatTime(competition.resultDate)}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Previous Winners</Text>
          <View style={styles.winnersRow}>
            {winnerCards.map((winner) => (
              <View key={winner.name} style={styles.winnerCard}>
                <View
                  style={[
                    styles.winnerAvatar,
                    { backgroundColor: winner.color },
                  ]}
                >
                  <Text style={styles.winnerInitial}>
                    {winner.name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.winnerName}>{winner.name}</Text>
                <Text style={styles.winnerPosition}>{winner.position}</Text>
              </View>
            ))}
          </View>

          <View style={styles.tabsRow}>
            <Text style={styles.activeTab}>About Competition</Text>
            <Text style={styles.inactiveTab}>Judging Parameters</Text>
            <Text style={styles.inactiveTab}>Rules & Eligibility</Text>
          </View>

          <Text style={styles.descriptionText}>{competition.description}</Text>
          <Text style={styles.linkText}>View more ▾</Text>

          <Text style={styles.sectionTitle}>Rewards (All Positions)</Text>
          <View style={styles.rewardList}>
            {rewardRows.map((reward) => (
              <View key={reward.position} style={styles.rewardRow}>
                <Text style={styles.rewardText}>
                  🏆 {reward.position}
                  {reward.position === 1
                    ? "st"
                    : reward.position === 2
                      ? "nd"
                      : reward.position === 3
                        ? "rd"
                        : "th"}{" "}
                  Winner
                </Text>
                <Text style={styles.rewardAmount}>
                  {formatCurrency(reward.amount)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              ℹ Disclaimer: Only contributions from paid participants will be
              considered for judging.
            </Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoRowItem}>
              <Text style={styles.infoRowIcon}>▶</Text>
              <Text style={styles.infoText}>
                How will you receive prize money?
              </Text>
            </View>
            <View style={styles.infoRowItem}>
              <Text style={styles.infoRowIcon}>✓</Text>
              <Text style={styles.infoText}>Refund policy</Text>
            </View>
            <View style={styles.infoRowItem}>
              <Text style={styles.infoRowIcon}>✓</Text>
              <Text style={styles.infoText}>
                Secure payments powered by Razorpay
              </Text>
            </View>
          </View>

          <View style={styles.referralCard}>
            <Text style={styles.referralTitle}>Refer & Earn more discount</Text>
            <View style={styles.referralInputRow}>
              <Text style={styles.referralInput}>
                https://feedants.com/r/referral123
              </Text>
              <Pressable style={styles.copyButton}>
                <Text style={styles.copyText}>Copy Link</Text>
              </Pressable>
            </View>
            <Pressable style={styles.referralCTA}>
              <Text style={styles.referralButtonText}>Refer Now</Text>
            </Pressable>
          </View>

          <Pressable style={styles.bottomActionCard} onPress={handleAction}>
            <Text style={styles.actionTitle}>{buttonText}</Text>
          </Pressable>

          {loading && (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="small" color="#0b8f8c" />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#edf5f5",
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 80,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  backText: {
    fontSize: 18,
    color: "#0d1b2a",
    fontWeight: "600",
  },
  langBadge: {
    backgroundColor: "#e7ecec",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  langText: {
    fontSize: 12,
    color: "#1f2937",
    fontWeight: "700",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    color: "#0d1b2a",
    fontWeight: "800",
    flex: 1,
    flexShrink: 1,
  },
  registeredBadge: {
    backgroundColor: "#dff7f2",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#79d1bf",
  },
  registeredText: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "700",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  tagPill: {
    backgroundColor: "#e8f3f2",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "600",
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#eef6f5",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  metricBox: {
    flex: 1,
    alignItems: "center",
  },
  metricLabel: {
    color: "#3f4b5d",
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    color: "#0d1b2a",
    fontSize: 28,
    fontWeight: "800",
  },
  progressWrap: {
    marginBottom: 18,
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#d9e8e8",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#0fb5a8",
    borderRadius: 999,
  },
  progressMeta: {
    marginTop: 8,
    color: "#2c3748",
    fontSize: 12,
    fontWeight: "600",
  },
  judgeCard: {
    backgroundColor: "#edf8f7",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#d7c4ff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#1f2937",
    fontWeight: "800",
    fontSize: 18,
  },
  judgeInfo: {
    flex: 1,
  },
  smallLabel: {
    color: "#536174",
    fontSize: 12,
    marginBottom: 2,
  },
  judgeName: {
    color: "#0c2436",
    fontSize: 20,
    fontWeight: "800",
  },
  judgeMeta: {
    color: "#536174",
    fontSize: 12,
    marginTop: 2,
  },
  videoButton: {
    backgroundColor: "#d8eff1",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  videoIcon: {
    color: "#0f766e",
    fontSize: 18,
    fontWeight: "700",
  },
  videoText: {
    color: "#0d1b2a",
    fontSize: 12,
    fontWeight: "700",
  },
  timerRow: {
    backgroundColor: "#dff5f2",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  timerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  timerItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 10,
  },
  timerIcon: {
    color: "#0f766e",
    fontSize: 18,
  },
  timerText: {
    color: "#0d1b2a",
    fontWeight: "700",
    fontSize: 12,
  },
  timerStrong: {
    color: "#0d1b2a",
    fontWeight: "800",
    fontSize: 12,
  },
  sectionTitle: {
    color: "#0d1b2a",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
  },
  dateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 22,
    gap: 10,
  },
  dateBox: {
    width: "48%",
    backgroundColor: "#f3f7f7",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#dfe9e9",
  },
  dateIcon: {
    fontSize: 18,
    marginBottom: 8,
  },
  dateHeading: {
    color: "#3d4a5d",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  dateValue: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  winnersRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  winnerCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#f3f6f6",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  winnerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  winnerInitial: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },
  winnerName: {
    textAlign: "center",
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "700",
  },
  winnerPosition: {
    marginTop: 4,
    color: "#52657b",
    fontSize: 11,
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#edf5f5",
    borderRadius: 12,
    overflow: "hidden",
    padding: 4,
    marginBottom: 12,
  },
  activeTab: {
    flex: 1,
    textAlign: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingVertical: 8,
    color: "#0ea5a0",
    fontWeight: "700",
    fontSize: 11,
  },
  inactiveTab: {
    flex: 1,
    textAlign: "center",
    color: "#5b6472",
    fontWeight: "600",
    fontSize: 11,
    paddingVertical: 8,
  },
  descriptionText: {
    color: "#3a4658",
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 8,
  },
  linkText: {
    color: "#0ea5a0",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 18,
  },
  rewardList: {
    gap: 12,
    marginBottom: 18,
  },
  rewardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#dfe9e9",
  },
  rewardText: {
    color: "#0d1b2a",
    fontSize: 15,
    fontWeight: "700",
  },
  rewardAmount: {
    color: "#0d1b2a",
    fontSize: 16,
    fontWeight: "800",
  },
  noticeBox: {
    backgroundColor: "#dfeef2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  noticeText: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "600",
  },
  infoGrid: {
    gap: 10,
    marginBottom: 18,
  },
  infoRowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f4f7f7",
    borderRadius: 12,
    padding: 12,
  },
  infoRowIcon: {
    color: "#0f766e",
    fontSize: 16,
  },
  infoText: {
    color: "#1f2937",
    fontSize: 14,
    fontWeight: "600",
  },
  referralCard: {
    backgroundColor: "#dff4ef",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  referralTitle: {
    color: "#0d1b2a",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },
  referralInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  referralInput: {
    flex: 1,
    backgroundColor: "#f4fbfb",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: "#475569",
    fontSize: 12,
  },
  copyButton: {
    backgroundColor: "#eaf4f4",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  copyText: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "700",
  },
  referralCTA: {
    backgroundColor: "#0d8d8f",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 12,
  },
  referralButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  bottomActionCard: {
    backgroundColor: "#0a7f7c",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: "center",
    marginTop: 10,
  },
  actionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  actionSubtitle: {
    color: "#d9fefb",
    fontSize: 12,
    marginTop: 4,
  },
  loaderWrap: {
    marginVertical: 12,
    alignItems: "center",
  },
});

//avrzjqwo
//jtuedsvv