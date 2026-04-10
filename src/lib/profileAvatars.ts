import defaultAvatar from "../assets/Easter Default.png";
import southKnight from "../assets/The South Knight.png";
import avatar1 from "../assets/Avatar 1.png";
import avatar2 from "../assets/Avatar 2.png";
import avatar3 from "../assets/Avatar 3.png";
import avatar4 from "../assets/Avatar 4.png";
import avatar5 from "../assets/Avatar 5.png";

export const PROFILE_AVATAR_PRESET_PREFIX = "preset:";

export const PROFILE_AVATAR_OPTIONS = [
  { id: "default", label: "Easter Default", url: defaultAvatar },
  { id: "south", label: "South Knight", url: southKnight },
  { id: "avatar1", label: "Avatar 1", url: avatar1 },
  { id: "avatar2", label: "Avatar 2", url: avatar2 },
  { id: "avatar3", label: "Avatar 3", url: avatar3 },
  { id: "avatar4", label: "Avatar 4", url: avatar4 },
  { id: "avatar5", label: "Avatar 5", url: avatar5 },
] as const;

export type ProfileAvatarPresetId = (typeof PROFILE_AVATAR_OPTIONS)[number]["id"];

const avatarUrlById = new Map<ProfileAvatarPresetId, string>(
  PROFILE_AVATAR_OPTIONS.map((avatar) => [avatar.id, avatar.url]),
);

const avatarIdByUrl = new Map<string, ProfileAvatarPresetId>(
  PROFILE_AVATAR_OPTIONS.map((avatar) => [avatar.url, avatar.id]),
);

const avatarLegacyMatchers: Record<ProfileAvatarPresetId, string[]> = {
  default: ["easter default"],
  south: ["the south knight", "south knight"],
  avatar1: ["avatar 1"],
  avatar2: ["avatar 2"],
  avatar3: ["avatar 3"],
  avatar4: ["avatar 4"],
  avatar5: ["avatar 5"],
};

export function presetAvatarValue(id: ProfileAvatarPresetId) {
  return `${PROFILE_AVATAR_PRESET_PREFIX}${id}`;
}

function matchLegacyAvatarId(value: string): ProfileAvatarPresetId | null {
  const normalized = decodeURIComponent(value).toLowerCase();
  for (const [id, patterns] of Object.entries(avatarLegacyMatchers) as [ProfileAvatarPresetId, string[]][]) {
    if (patterns.some((pattern) => normalized.includes(pattern))) {
      return id;
    }
  }
  return null;
}

export function normalizeProfileAvatarValue(value: string | null | undefined): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return presetAvatarValue("default");

  if (trimmed.startsWith(PROFILE_AVATAR_PRESET_PREFIX)) {
    const presetId = trimmed.slice(PROFILE_AVATAR_PRESET_PREFIX.length) as ProfileAvatarPresetId;
    return avatarUrlById.has(presetId) ? trimmed : presetAvatarValue("default");
  }

  const presetFromUrl = avatarIdByUrl.get(trimmed);
  if (presetFromUrl) return presetAvatarValue(presetFromUrl);

  const presetFromLegacy = matchLegacyAvatarId(trimmed);
  if (presetFromLegacy) return presetAvatarValue(presetFromLegacy);

  return trimmed;
}

export function resolveProfileAvatarUrl(value: string | null | undefined): string {
  const normalized = normalizeProfileAvatarValue(value);
  if (normalized.startsWith(PROFILE_AVATAR_PRESET_PREFIX)) {
    const presetId = normalized.slice(PROFILE_AVATAR_PRESET_PREFIX.length) as ProfileAvatarPresetId;
    return avatarUrlById.get(presetId) || defaultAvatar;
  }
  return normalized;
}
