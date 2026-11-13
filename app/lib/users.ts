// Test users shared by the server-side login checks. See CASES.md.
// `totpSecret` (base32) is only used by the 2FA case at `/`; it must stay
// server-side: never import this module from a 'use client' component.
export const USERS: Record<string, { password: string; totpSecret: string; role: string }> = {
  testuser_01: { password: "Test@1234!", totpSecret: "JBSWY3DPEHPK3PXP", role: "Usuario" },
  testuser_02: { password: "Secure#5678!", totpSecret: "KRUGKIDROVUWG2ZA", role: "Usuario" },
  admin_test: { password: "Admin@Pass99!", totpSecret: "N5UGC3THNFQWMZLB", role: "Admin" },
};
