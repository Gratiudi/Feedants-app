import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton>Discover</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.tabButton, isFocused && styles.tabButtonActive, pressed && styles.pressed]}>
      <Text style={[styles.tabButtonText, isFocused && styles.tabButtonTextActive]}>{children}</Text>
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={[styles.tabBar, props.style]}>
      <View style={styles.tabBarInner}>
        <Text style={styles.brand}>feedants</Text>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e4e9e2',
  },
  tabBarInner: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brand: {
    flex: 1,
    color: '#12231f',
    fontSize: 15,
    fontWeight: '800',
  },
  tabButton: {
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  tabButtonActive: {
    backgroundColor: '#eaf3ec',
  },
  tabButtonText: {
    color: '#71817a',
    fontSize: 12,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#176b53',
  },
  pressed: {
    opacity: 0.7,
  },
});
