import { getLeaderboard, type UserProfile } from "../lib/mockApi";

export async function bootstrapLeaderboardData(user: UserProfile) {
  return getLeaderboard(user);
}
