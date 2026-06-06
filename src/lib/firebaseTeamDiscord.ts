import { doc, getDocFromServer, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import type { StoredTeamDiscord } from "../types";
import { getFirebaseDb } from "./firebase";

const COLLECTION = "config";
const DOC_ID = "teamDiscord";

function teamDiscordRef() {
  return doc(getFirebaseDb(), COLLECTION, DOC_ID);
}

function normalizeTeamDiscord(raw: unknown): StoredTeamDiscord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1 || typeof o.csv !== "string" || typeof o.updatedAt !== "string") return null;
  return {
    version: 1,
    csv: o.csv,
    updatedAt: o.updatedAt,
    updatedBy: typeof o.updatedBy === "string" ? o.updatedBy : undefined,
  };
}

export async function saveTeamDiscordToFirestore(
  csv: string,
  updatedBy?: string,
): Promise<StoredTeamDiscord> {
  const payload: StoredTeamDiscord = {
    version: 1,
    csv,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  await setDoc(teamDiscordRef(), payload);
  return payload;
}

export async function fetchTeamDiscordFromServer(): Promise<StoredTeamDiscord | null> {
  const snap = await getDocFromServer(teamDiscordRef());
  if (!snap.exists()) return null;
  return normalizeTeamDiscord(snap.data());
}

export function subscribeTeamDiscordFromFirestore(
  onData: (data: StoredTeamDiscord | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    teamDiscordRef(),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(normalizeTeamDiscord(snap.data()));
    },
    (err) => {
      onError?.(err);
      onData(null);
    },
  );
}
