import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && (!name || !phone))) {
      const msg = 'Please fill in all fields';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin 
        ? { email, password } 
        : { name, email, phone, password };

      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      await login(data.token, data.user);
    } catch (error: any) {
      Platform.OS === 'web' ? window.alert(error.message) : Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
        
        {!isLogin && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </>
        )}
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isLogin ? 'Log In' : 'Sign Up'}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => setIsLogin(!isLogin)} style={styles.switchButton}>
          <Text style={styles.switchText}>
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#edf5f5',
    justifyContent: 'center',
  },
  formContainer: {
    padding: 24,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0d1b2a',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f4fbfb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#0d1b2a',
  },
  button: {
    backgroundColor: '#0fb5a8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#0fb5a8',
    fontSize: 14,
    fontWeight: '600',
  },
});
