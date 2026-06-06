import type { StoredTeamDiscord } from "../types";
import { currentAdminUser } from "./adminAuth";
import { isFirebaseConfigured } from "./firebase";
import { saveTeamDiscordToFirestore, subscribeTeamDiscordFromFirestore } from "./firebaseTeamDiscord";

const KEY = "tri-saturdays-league-team-discord-v1";
const MAX_STORAGE_BYTES = 500_000;

export const TEAM_DISCORD_CHANGE_EVENT = "tri-saturdays-league-team-discord-changed";

export type { StoredTeamDiscord };

function readLocalCsv(): string {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw || raw.length > MAX_STORAGE_BYTES) return "";
    const p = JSON.parse(raw) as StoredTeamDiscord;
    if (p?.version !== 1 || typeof p.csv !== "string") return "";
    return p.csv;
  } catch {
    return "";
  }
}

function mentorEmail(): string | undefined {
  return currentAdminUser()?.email ?? undefined;
}

function writeLocalCsv(csv: string) {
  const payload: StoredTeamDiscord = {
    version: 1,
    csv,
    updatedAt: new Date().toISOString(),
    updatedBy: mentorEmail(),
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event(TEAM_DISCORD_CHANGE_EVENT));
}

export function usesFirebaseTeamDiscord(): boolean {
  return isFirebaseConfigured();
}

export async function saveTeamDiscord(csv: string): Promise<StoredTeamDiscord> {
  const updatedBy = mentorEmail();
  if (isFirebaseConfigured()) {
    return saveTeamDiscordToFirestore(csv, updatedBy);
  }
  writeLocalCsv(csv);
  return {
    version: 1,
    csv,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
}

export function subscribeTeamDiscord(
  onData: (data: StoredTeamDiscord | null) => void,
  onError?: (error: Error) => void,
): () => void {
  if (isFirebaseConfigured()) {
    return subscribeTeamDiscordFromFirestore(onData, onError);
  }

  const refresh = () => {
    const csv = readLocalCsv();
    onData(csv ? { version: 1, csv, updatedAt: "", updatedBy: undefined } : null);
  };
  refresh();
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) refresh();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(TEAM_DISCORD_CHANGE_EVENT, refresh);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(TEAM_DISCORD_CHANGE_EVENT, refresh);
  };
}
