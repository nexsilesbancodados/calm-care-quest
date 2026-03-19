import { createContext, useContext, useState, useCallback } from "react";

export type UserRole = "admin" | "farma";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  crf?: string;
  initials: string;
}

interface AuthContextType {
  user: AppUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  can: (action: Permission) => boolean;
  invitedUsers: AppUser[];
  inviteUser: (user: Omit<AppUser, "id">) => void;
  removeUser: (id: string) => void;
}

export type Permission =
  | "edit"
  | "delete"
  | "undo"
  | "invite_users"
  | "manage_settings"
  | "view_all";

const rolePermissions: Record<UserRole, Permission[]> = {
  admin: ["edit", "delete", "undo", "invite_users", "manage_settings", "view_all"],
  farma: ["view_all", "edit"],
};

const mockUsers: Record<string, AppUser & { password: string }> = {
  "admin@hospital.com": {
    id: "u1",
    name: "Dr. Carlos Mendes",
    email: "admin@hospital.com",
    role: "admin",
    crf: "CRF-SP 12345",
    initials: "CM",
    password: "admin123",
  },
  "farma@hospital.com": {
    id: "u2",
    name: "Farm. João Santos",
    email: "farma@hospital.com",
    role: "farma",
    crf: "CRF-SP 67890",
    initials: "JS",
    password: "farma123",
  },
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  logout: () => {},
  can: () => false,
  invitedUsers: [],
  inviteUser: () => {},
  removeUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    const stored = localStorage.getItem("psifarma-user");
    return stored ? JSON.parse(stored) : null;
  });

  const [invitedUsers, setInvitedUsers] = useState<AppUser[]>([
    { id: "u2", name: "Farm. João Santos", email: "farma@hospital.com", role: "farma", crf: "CRF-SP 67890", initials: "JS" },
    { id: "u3", name: "Enf. Maria Silva", email: "maria@hospital.com", role: "farma", initials: "MS" },
    { id: "u4", name: "Enf. Ana Costa", email: "ana@hospital.com", role: "farma", initials: "AC" },
  ]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const found = mockUsers[email.toLowerCase()];
    if (!found || found.password !== password) {
      return false;
    }
    const { password: _pw, ...userData } = found;
    setUser(userData);
    localStorage.setItem("psifarma-user", JSON.stringify(userData));
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("psifarma-user");
  }, []);

  const can = useCallback(
    (action: Permission) => {
      if (!user) return false;
      return rolePermissions[user.role].includes(action);
    },
    [user]
  );

  const inviteUser = useCallback((newUser: Omit<AppUser, "id">) => {
    setInvitedUsers((prev) => [
      ...prev,
      { ...newUser, id: crypto.randomUUID() },
    ]);
  }, []);

  const removeUser = useCallback((id: string) => {
    setInvitedUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, can, invitedUsers, inviteUser, removeUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export const roleLabels: Record<UserRole, string> = {
  admin: "Administrador",
  farma: "Farmacêutico",
};

export const roleDescriptions: Record<UserRole, string> = {
  admin: "Acesso total: editar, excluir, desfazer e convidar usuários",
  farma: "Visualizar tudo, editar registros, sem desfazer ações",
};
