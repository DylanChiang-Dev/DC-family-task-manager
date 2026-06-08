/**
 * API Integration Test Script
 * Verifies Phase 1 Auth & DB flow.
 */

const BASE_URL = "http://localhost:8787";

async function runTests() {
  console.log("🚀 Starting API integration tests...");
  let exitCode = 0;

  try {
    // 1. Health check
    console.log("1. Testing health check endpoint...");
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    console.log("Health Status:", healthRes.status);
    console.log("Health Data:", JSON.stringify(healthData, null, 2));
    if (healthRes.status !== 200 || !healthData.success) {
      throw new Error("Health check failed");
    }

    // Generate random usernames
    const randomSuffix = Math.random().toString(36).substring(7);
    const username1 = `user_a_${randomSuffix}`;
    const username2 = `user_b_${randomSuffix}`;
    const password = "password123";
    const nickname1 = "User A";
    const nickname2 = "User B";

    // 2. Register first user (creates team)
    console.log(`2. Registering User A (${username1}) to create a team...`);
    const regRes1 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username1,
        password: password,
        nickname: nickname1,
        teamOption: "create",
        teamName: "Super Family",
      }),
    });
    const regData1 = await regRes1.json();
    console.log("Register User A status:", regRes1.status);
    console.log("Register User A response:", JSON.stringify(regData1, null, 2));

    if (regRes1.status !== 201 || !regData1.success) {
      throw new Error("Registration A failed");
    }

    const { accessToken: tokenA, refreshToken: refreshA } = regData1.data;
    const inviteCode = regData1.data.team.inviteCode;
    console.log("Generated Invite Code:", inviteCode);

    // 3. Get User A profile (me)
    console.log("3. Testing GET /auth/me for User A...");
    const meRes1 = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        "Authorization": `Bearer ${tokenA}`
      }
    });
    const meData1 = await meRes1.json();
    console.log("Me User A status:", meRes1.status);
    console.log("Me User A response:", JSON.stringify(meData1, null, 2));
    if (meRes1.status !== 200 || !meData1.success) {
      throw new Error("GET /me failed for User A");
    }

    // 4. Register second user (joins team with invite code)
    console.log(`4. Registering User B (${username2}) to join the team via invite code...`);
    const regRes2 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username2,
        password: password,
        nickname: nickname2,
        teamOption: "join",
        inviteCode: inviteCode,
      }),
    });
    const regData2 = await regRes2.json();
    console.log("Register User B status:", regRes2.status);
    console.log("Register User B response:", JSON.stringify(regData2, null, 2));
    if (regRes2.status !== 201 || !regData2.success) {
      throw new Error("Registration B failed");
    }

    const { accessToken: tokenB, refreshToken: refreshB } = regData2.data;

    // 5. Test login for User A
    console.log("5. Testing login for User A...");
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username1,
        password: password,
      }),
    });
    const loginData = await loginRes.json();
    console.log("Login User A status:", loginRes.status);
    console.log("Login User A response:", JSON.stringify(loginData, null, 2));
    if (loginRes.status !== 200 || !loginData.success) {
      throw new Error("Login failed for User A");
    }

    // 6. Test login fail (wrong password)
    console.log("6. Testing login failure (wrong password)...");
    const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username1,
        password: "wrong_password",
      }),
    });
    const badLoginData = await badLoginRes.json();
    console.log("Bad login status (expected 401):", badLoginRes.status);
    console.log("Bad login response:", JSON.stringify(badLoginData, null, 2));
    if (badLoginRes.status !== 401 || badLoginData.success !== false) {
      throw new Error("Expected login failure did not return 401");
    }

    // 7. Refresh token
    console.log("7. Testing refresh token flow...");
    const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refreshToken: refreshA,
      }),
    });
    const refreshData = await refreshRes.json();
    console.log("Refresh status:", refreshRes.status);
    console.log("Refresh response:", JSON.stringify(refreshData, null, 2));
    if (refreshRes.status !== 200 || !refreshData.success) {
      throw new Error("Token refresh failed");
    }

    const newAccessToken = refreshData.data.accessToken;
    const newRefreshToken = refreshData.data.refreshToken;

    // 8. Logout User A
    console.log("8. Testing logout...");
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refreshToken: newRefreshToken,
      }),
    });
    const logoutData = await logoutRes.json();
    console.log("Logout status:", logoutRes.status);
    console.log("Logout response:", JSON.stringify(logoutData, null, 2));
    if (logoutRes.status !== 200 || !logoutData.success) {
      throw new Error("Logout failed");
    }

    // 9. Try to refresh with revoked token (should fail)
    console.log("9. Verify that revoked refresh token fails to refresh...");
    const badRefreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refreshToken: newRefreshToken,
      }),
    });
    const badRefreshData = await badRefreshRes.json();
    console.log("Revoked refresh status (expected 401):", badRefreshRes.status);
    console.log("Revoked refresh response:", JSON.stringify(badRefreshData, null, 2));
    if (badRefreshRes.status !== 401 || badRefreshData.success !== false) {
      throw new Error("Expected revoked refresh token to fail with 401");
    }

    // 10. Register user with invalid invite code (should return 404 INVITE_NOT_FOUND)
    console.log("10. Register user with invalid invite code...");
    const badInviteRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: `user_c_${randomSuffix}`,
        password: password,
        nickname: "User C",
        teamOption: "join",
        inviteCode: "999999", // Invalid invite code
      }),
    });
    const badInviteData = await badInviteRes.json();
    console.log("Invalid invite register status (expected 404):", badInviteRes.status);
    console.log("Invalid invite register response:", JSON.stringify(badInviteData, null, 2));
    if (badInviteRes.status !== 404 || badInviteData.error?.code !== "NOT_FOUND") {
      throw new Error("Expected invalid invite to fail with 404 and NOT_FOUND error code");
    }

    console.log("🎉 All tests passed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    exitCode = 1;
  }

  process.exit(exitCode);
}

runTests();
