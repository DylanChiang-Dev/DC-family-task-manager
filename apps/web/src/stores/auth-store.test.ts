import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "./auth-store";

const reset = () =>
  useAuthStore.setState({
    accessToken: null,
    user: null,
    currentTeamId: null,
    isBootstrapped: false,
  });

describe("auth-store", () => {
  beforeEach(reset);

  it("setAuth stores token, user and team", () => {
    useAuthStore.getState().setAuth({
      accessToken: "tok",
      user: { id: 1, username: "a", nickname: "A", email: null, currentTeamId: 5, createdAt: 0 },
      currentTeamId: 5,
    });

    const s = useAuthStore.getState();
    expect(s.accessToken).toBe("tok");
    expect(s.user?.id).toBe(1);
    expect(s.currentTeamId).toBe(5);
  });

  it("setAccessToken updates only the token", () => {
    useAuthStore.getState().setAccessToken("new");
    expect(useAuthStore.getState().accessToken).toBe("new");
  });

  it("clearAuth wipes token and user but keeps currentTeamId", () => {
    useAuthStore.getState().setAuth({
      accessToken: "tok",
      user: { id: 1, username: "a", nickname: "A", email: null, currentTeamId: 5, createdAt: 0 },
      currentTeamId: 5,
    });
    useAuthStore.getState().clearAuth();

    const s = useAuthStore.getState();
    expect(s.accessToken).toBeNull();
    expect(s.user).toBeNull();
    expect(s.currentTeamId).toBe(5);
  });
});
