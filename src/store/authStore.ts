import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import supabase from './../utils/supabase';

export interface User {
  id: string; // username
  password?: string; // in a real app, hash this!
  role: 'admin' | 'user';
  permissions: string[]; // e.g., ['Dashboard', 'Document', 'Loan']
  deleted?: string;
  rawData?: any[];
  name?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  users: User[]; // List of all users
  login: (username: string, password: string) => boolean;
  logout: () => void;
  setAuthenticatedUser: (user: User) => void;
  addUser: (user: User) => boolean;
  updateUser: (id: string, updatedUser: Partial<User>) => void;
  deleteUser: (id: string) => void;
  setUsers: (users: User[]) => void;
}


const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      currentUser: null,
      users: [],

      login: async (username: string, password: string) => {
  try {
    const { data, error } = await supabase
      .from('login')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) {
      return false;
    }

    // Deleted check
    if (data.deleted === true) {
      return false;
    }

    const role = (data.role || 'user').toLowerCase() as 'admin' | 'user';

    let permissions: string[] = [];

    if (role === 'admin') {
      permissions = ['Dashboard', 'Document', 'Subscription', 'Loan', 'Calendar', 'Master', 'Settings'];
    } else {
      const rawPermissions = (data.pages || "").toString();
      permissions = rawPermissions
        .split(',')
        .map((p: string) => p.trim())
        .filter((p: string) => p.length > 0);
    }

    const user: User = {
      id: data.username,
      name: data.name,
      role,
      permissions,
    };

    set({ isAuthenticated: true, currentUser: user });

    return true;
  } catch (err) {
    console.error("Login error:", err);
    return false;
  }
},

      logout: () => {
        set({ isAuthenticated: false, currentUser: null });
      },

      setAuthenticatedUser: (user: User) => {
        set({ isAuthenticated: true, currentUser: user });
      },

      addUser: (newUser: User) => {
        const { users } = get();
        if (users.some(u => u.id === newUser.id)) {
          return false; // User already exists
        }
        set({ users: [...users, newUser] });
        return true;
      },

      updateUser: (id: string, updatedUser: Partial<User>) => {
        set((state) => ({
          users: state.users.map(u => u.id === id ? { ...u, ...updatedUser } : u),
          // If updating the currently logged in user, update that too
          currentUser: state.currentUser?.id === id ? { ...state.currentUser, ...updatedUser } : state.currentUser
        }));
      },

      deleteUser: (id: string) => {
        set((state) => ({
          users: state.users.filter(u => u.id !== id)
        }));
      },

      setUsers: (users: User[]) => {
        set({ users });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        users: state.users,
        isAuthenticated: state.isAuthenticated,
        currentUser: state.currentUser
      }),
    }
  )
);

export default useAuthStore;