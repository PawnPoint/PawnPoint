import type { UserProfile } from "./mockApi";

export function hasActiveSubscription(user?: Pick<UserProfile, "premiumAccess" | "subscriptionStatus"> | null) {
  return !!(user?.premiumAccess || user?.subscriptionStatus === "active");
}

export function hasSiteAdminAccess(user?: Pick<UserProfile, "adminKeyUnlocked" | "isAdmin"> | null) {
  return !!(user?.adminKeyUnlocked || user?.isAdmin);
}

export function isSouthKnightMember(user?: Pick<UserProfile, "groupId" | "groupCode"> | null) {
  return user?.groupId === "south-knight" || !!user?.groupCode?.includes("0055");
}

export function isClubStudent(
  user?: Pick<UserProfile, "accountType" | "groupId" | "groupRole"> | null,
) {
  return user?.accountType === "group" && !!user?.groupId && user.groupRole === "member";
}

export function canAccessBlackBook(user?: UserProfile | null) {
  return hasActiveSubscription(user) || hasSiteAdminAccess(user) || isSouthKnightMember(user) || isClubStudent(user);
}

export function canAccessTrainingPage(user?: UserProfile | null) {
  return hasActiveSubscription(user) || hasSiteAdminAccess(user) || isSouthKnightMember(user);
}
