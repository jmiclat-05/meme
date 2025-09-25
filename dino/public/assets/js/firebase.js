import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getDatabase, ref, set, get, child,
  query, orderByChild, limitToLast
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

let app, db;

// ---------- Init Firebase ----------
export async function initFirebase() {
  const cfg = await fetch("/config").then(r => r.json());
  app = initializeApp(cfg);
  db = getDatabase(app);

  const auth = getAuth(app);
  await signInAnonymously(auth);
}

// ---------- Create Player ----------
/**
 * Create a player if not exist.
 * @param {string} address - Unique address (acts as UID)
 * @param {string} nickname - Unique nickname
 * @returns {Promise<string|number>} address if created/existed,
 *                                   -1 if nickname taken,
 *                                   "Parse Error" on exception.
 */
export async function createPlayer(address, nickname) {
  try {
    const playersRef = ref(db, "players/" + address);
    const nickRef = ref(db, "nicknames/" + nickname);

    // 1. Address already exists?
    const playerSnap = await get(playersRef);
    if (playerSnap.exists()) return address;

    // 2. Nickname already taken?
    const nickSnap = await get(nickRef);
    if (nickSnap.exists()) return -1;

    // 3. Reserve nickname first (atomicity: write nickname -> address)
    await set(nickRef, address);

    // 4. Create the player record
    await set(playersRef, { nickname, score: 0 });

    return address;
  } catch (err) {
    console.log("Parsing error:", err.message);
    return "Parse Error";
  }
}

// ---------- Get Player ----------
export async function getPlayer(address) {
  try {
    const snap = await get(child(ref(db), "players/" + address));
    return snap.exists() ? snap.val() : null;
  } catch (err) {
    console.log("Parsing error:", err.message);
    return "Parse Error";
  }
}

// ---------- Save Score ----------
export async function saveScore(address, newScore) {
  try {
    const scoreRef = ref(db, `players/${address}/score`);
    const snapshot = await get(scoreRef);
    const currentScore = snapshot.exists() ? snapshot.val() : 0;

    if (parseInt(newScore) > parseInt(currentScore)) {
      await set(scoreRef, newScore);
      console.log(`Score updated to ${newScore}`);
      return true;
    } else {
      console.log("Score not updated – new score is not higher.");
      return false;
    }
  } catch (err) {
    console.log("Parsing error:", err.message);
    return "Parse Error";
  }
}

// ---------- Get Top Scores ----------
export async function getTopScores(limit = 10) {
  try {
    const q = query(ref(db, "players"), orderByChild("score"), limitToLast(limit));
    const snap = await get(q);
    if (!snap.exists()) return [];
    const arr = Object.entries(snap.val()).map(([address, v]) => ({ address, ...v }));
    // Firebase returns ascending order, so sort descending
    return arr.sort((a, b) => b.score - a.score);
  } catch (err) {
    console.log("Parsing error:", err.message);
    return "Parse Error";
  }
}
