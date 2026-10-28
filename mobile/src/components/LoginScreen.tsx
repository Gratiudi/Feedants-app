import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/config/api';

type LoginScreenProps = {
  onContinueAsGuest?: () => void;
};

type AuthResponse = {
  message?: string;
  token?: string;
  user?: { id: string; name: string; email: string; role: string };
};

export default function LoginScreen({ onContinueAsGuest }: LoginScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleClose = () => {
    if (onContinueAsGuest) {
      onContinueAsGuest();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleSubmit = async () => {
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password || (!isLogin && (!name.trim() || !phone.trim()))) {
      setError('Complete all required fields to continue.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!isLogin && password.length < 8) {
      setError('Choose a password with at least 8 characters.');
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}${isLogin ? '/api/auth/login' : '/api/auth/register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isLogin
            ? { email: normalizedEmail, password }
            : { name: name.trim(), email: normalizedEmail, phone: phone.trim(), password },
        ),
      });
      const data: AuthResponse = await response.json();
      if (!response.ok) throw new Error(data.message || 'Authentication failed.');
      if (!data.token || !data.user) throw new Error('The server returned an incomplete sign-in response.');
      await login(data.token, data.user);
      handleClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to connect to Feedants. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <Pressable onPress={handleClose} accessibilityRole="button" accessibilityLabel="Close sign in" style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
            <Text style={styles.topBrand}>feedants</Text>
            <View style={styles.closeButtonSpacer} />
          </View>
          <View style={styles.card}>
            <View style={styles.brandMark}><Text style={styles.brandLetter}>f</Text></View>
            <Text style={styles.eyebrow}>{isLogin ? 'YOUR NEXT CHAPTER STARTS HERE' : 'JOIN THE COMMUNITY'}</Text>
            <Text style={styles.title}>{isLogin ? 'Welcome back.' : 'Make your mark.'}</Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Sign in to explore your opportunities.' : 'Create an account to join competitions and share your performances.'}
            </Text>

            {!isLogin && (
              <>
                <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" />
                <Field label="Phone number" value={phone} onChangeText={setPhone} placeholder="Your phone number" keyboardType="phone-pad" autoComplete="tel" />
              </>
            )}
            <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <Field label="Password" value={password} onChangeText={setPassword} placeholder={isLogin ? 'Enter your password' : 'At least 8 characters'} secureTextEntry autoComplete={isLogin ? 'current-password' : 'new-password'} />
            {!isLogin && <Field label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Enter your password again" secureTextEntry autoComplete="new-password" />}

            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleSubmit()}
              disabled={loading}
              style={({ pressed }) => [styles.submitButton, loading && styles.submitDisabled, pressed && !loading && styles.submitPressed]}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{isLogin ? 'Sign in' : 'Create account'} <Text style={styles.submitArrow}>→</Text></Text>}
            </Pressable>
            <Pressable onPress={() => { setIsLogin((value) => !value); setError(''); }} style={styles.switchButton}>
              <Text style={styles.switchText}>{isLogin ? 'New to Feedants? ' : 'Already have an account? '}<Text style={styles.switchEmphasis}>{isLogin ? 'Create account' : 'Sign in'}</Text></Text>
            </Pressable>
            <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>OR</Text><View style={styles.dividerLine} /></View>
            <Pressable onPress={handleClose} style={styles.guestButton}>
              <Text style={styles.guestText}>Continue exploring as a guest <Text style={styles.guestArrow}>↗</Text></Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={styles.input}
        placeholderTextColor="#94a19a"
        returnKeyType="next"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f2' },
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 },
  topBar: { height: 55, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeButton: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4e9e2' },
  closeText: { color: '#58675e', fontSize: 22, lineHeight: 25 },
  topBrand: { color: '#173a30', fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  closeButtonSpacer: { width: 35 },
  card: { width: '100%', maxWidth: 450, alignSelf: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6ebe4', borderRadius: 24, padding: 23, marginTop: 10 },
  brandMark: { width: 37, height: 37, borderRadius: 13, backgroundColor: '#176b53', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  brandLetter: { color: '#fff', fontSize: 21, fontWeight: '800' },
  eyebrow: { color: '#518067', fontSize: 9, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: '#12231f', fontSize: 30, lineHeight: 35, fontWeight: '800', letterSpacing: -1, marginTop: 8 },
  subtitle: { color: '#71817a', fontSize: 12, lineHeight: 18, marginTop: 7, marginBottom: 14 },
  field: { marginTop: 12 },
  label: { color: '#44574b', fontSize: 10, fontWeight: '700', marginBottom: 6 },
  input: { height: 45, borderWidth: 1, borderColor: '#e0e7e0', borderRadius: 11, paddingHorizontal: 12, color: '#1b2b23', fontSize: 13, backgroundColor: '#fcfdfb' },
  error: { color: '#a43e36', backgroundColor: '#fff2f0', borderWidth: 1, borderColor: '#f2d4d0', borderRadius: 10, padding: 10, fontSize: 11, lineHeight: 16, marginTop: 14 },
  submitButton: { minHeight: 48, borderRadius: 12, backgroundColor: '#176b53', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  submitDisabled: { opacity: 0.7 },
  submitPressed: { opacity: 0.85 },
  submitText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  submitArrow: { fontSize: 16 },
  switchButton: { alignItems: 'center', paddingVertical: 15 },
  switchText: { color: '#71817a', fontSize: 11 },
  switchEmphasis: { color: '#176b53', fontWeight: '800' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e9ede8' },
  dividerText: { color: '#9aa59d', fontSize: 8, fontWeight: '700' },
  guestButton: { alignItems: 'center', paddingTop: 15, paddingBottom: 2 },
  guestText: { color: '#56695d', fontSize: 11, fontWeight: '700' },
  guestArrow: { color: '#176b53', fontSize: 13 },
});
