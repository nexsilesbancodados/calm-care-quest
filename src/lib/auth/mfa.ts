// Helpers para MFA TOTP via Supabase Auth.
// Exigir em roles: admin, farmaceutico.

import { supabase } from "@/integrations/supabase/client";

export async function enrollTotp(friendlyName = "Calm Care Quest") {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
  });
  if (error) throw error;
  return data; // { id, type, totp: { qr_code, secret, uri } }
}

export async function challengeAndVerify(factorId: string, code: string) {
  const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
  if (cErr) throw cErr;
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (error) throw error;
  return data;
}

export async function listFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data;
}

export async function unenroll(factorId: string) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}

export async function getAal(): Promise<"aal1" | "aal2" | null> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return null;
  return (data.currentLevel as "aal1" | "aal2" | null) ?? null;
}

export function roleRequiresMfa(role: string): boolean {
  return role === "admin" || role === "farmaceutico";
}
