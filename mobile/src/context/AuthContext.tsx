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

// Utility to handle web vs native storage safely
const setStorageItemAsync = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch (e) { console.error('Local storage unavailable'); }
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const getStorageItemAsync = async (key: string) => {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  } else {
    return await SecureStore.getItemAsync(key);
  }
};

const deleteStorageItemAsync = async (key: string) => {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(key); } catch (e) { console.error('Local storage unavailable'); }
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
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
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
    setToken(newToken);
    setUser(newUser);
    await setStorageItemAsync('token', newToken);
    await setStorageItemAsync('user', JSON.stringify(newUser));
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await deleteStorageItemAsync('token');
    await deleteStorageItemAsync('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
