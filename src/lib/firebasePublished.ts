import { doc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import type { PublishedLeaderboard } from "../types";
import { getFirebaseDb } from "./firebase";

const COLLECTION = "leaderboard";
const DOC_ID = "published";

function publishedRef() {
  return doc(getFirebaseDb(), COLLECTION, DOC_ID);
}

export async function savePublishedToFirestore(
  data: Omit<PublishedLeaderboard, "version" | "publishedAt">,
): Promise<PublishedLeaderboard> {
  const payload: PublishedLeaderboard = {
    version: 1,
    ...data,
    publishedAt: new Date().toISOString(),
  };
  await setDoc(publishedRef(), payload);
  return payload;
}

export function subscribePublishedFromFirestore(
  onData: (data: PublishedLeaderboard | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    publishedRef(),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const raw = snap.data();
      if (raw && typeof raw === "object" && raw.version === 1) {
        onData(raw as PublishedLeaderboard);
      } else {
        onData(null);
      }
    },
    (err) => {
      onError?.(err);
      onData(null);
    },
  );
}
