import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

// Safe base64 decoder for React Native Hermes & Web
function safeDecodeBase64(str: string): string {
  try {
    if (typeof atob === 'function') {
      return atob(str);
    }
  } catch {
    // fallback to manual decode below
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  str = String(str).replace(/=+$/, '');
  for (
    let bc = 0, bs = 0, buffer, idx = 0;
    (buffer = str.charAt(idx++));
    ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
      ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
      : 0
  ) {
    buffer = chars.indexOf(buffer);
  }
  return output;
}

// Utility to handle web vs native storage safely
const setStorageItemAsync = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const getStorageItemAsync = async (key: string) => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
};

const deleteStorageItemAsync = async (key: string) => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const storedToken = await getStorageItemAsync('token');
        const storedUser = await getStorageItemAsync('user');
        
        if (storedToken && storedUser) {
          let isExpired = false;
          try {
            const parts = storedToken.split('.');
            if (parts.length === 3) {
              const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(
                safeDecodeBase64(base64)
                  .split('')
                  .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                  .join('')
              );
              const payload = JSON.parse(jsonPayload);
              if (payload.exp && Date.now() >= payload.exp * 1000) {
                isExpired = true;
              }
            }
          } catch {
            // Keep existing credentials if parse fails
            isExpired = false;
          }

          if (isExpired) {
            await deleteStorageItemAsync('token');
            await deleteStorageItemAsync('user');
            setToken(null);
            setUser(null);
          } else {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
          }
        }
      } catch (error) {
        console.error('Failed to load auth state', error);
      } finally {
        setLoading(false);
      }
    };
    
    void loadStorageData();
  }, []);

  const login = async (newToken: string, newUser: User) => {
    await setStorageItemAsync('token', newToken);
    await setStorageItemAsync('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    await deleteStorageItemAsync('token');
    await deleteStorageItemAsync('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
