import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

type Competition = {
  _id: string;
  title: string;
  description?: string;
  prizePool?: number;
  tags?: string[];
};

export default function HomeScreen() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/competitions");
        const data = await response.json();
        if (Array.isArray(data)) {
          setCompetitions(data);
        }
      } catch (error) {
        console.error("Unable to load competitions", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCompetitions();
  }, []);

  const renderItem = ({ item }: { item: Competition }) => (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: "/competition/[id]", params: { id: item._id } })}
    >
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.footer}>
        <Text style={styles.prizePool}>
          ₹ {item.prizePool?.toLocaleString("en-IN")}
        </Text>
        <Text style={styles.actionText}>View Details →</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.headerTitle}>Feedants Competitions</Text>
        
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#0b8f8c" />
          </View>
        ) : (
          <FlatList
            data={competitions}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}
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
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0d1b2a",
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 20,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0d1b2a",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#edf5f5",
    paddingTop: 12,
  },
  prizePool: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f766e",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0b8f8c",
  },
});
