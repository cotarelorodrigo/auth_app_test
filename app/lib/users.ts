// Test users shared by the server-side login checks. See CASES.md.
export const USERS: Record<string, { password: string; role: string }> = {
  testuser_01: { password: "Test@1234!", role: "Usuario" },
  testuser_02: { password: "Secure#5678!", role: "Usuario" },
  admin_test: { password: "Admin@Pass99!", role: "Admin" },
};
