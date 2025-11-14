const {onValueCreated} = require("firebase-functions/v2/database");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {getDatabase} = require("firebase-admin/database");

/**
 * matchmaker - Automatically pairs users from the matchmaking queue
 *
 * This function:
 * 1. Triggers when a new user joins the queue
 * 2. Finds a compatible partner based on preferences and interests
 * 3. Creates a chat session atomically
 * 4. Removes both users from the queue
 *
 * Matching Priority:
 * 1. Shared interests (within searchTimeout window)
 * 2. Compatible gender preferences
 * 3. Not blocked by each other
 * 4. FIFO for fairness
 */
exports.matchmaker = onValueCreated({
  ref: "/matchmakingQueue/{userId}",
  region: "us-central1",
}, async (event) => {
  const userId = event.params.userId;
  const newUserData = event.data.val();

  if (!newUserData) {
    console.log("No data for new queue entry");
    return;
  }

  const db = getFirestore();
  const rtdb = getDatabase();

  try {
    console.log(`Finding match for user ${userId}...`);

    // Get all queue entries
    const queueSnapshot = await rtdb.ref("matchmakingQueue").
        once("value");
    const allQueueData = queueSnapshot.val() || {};

    // Remove the new user from consideration
    delete allQueueData[userId];

    const queueEntries = Object.entries(allQueueData).map(([uid, data]) => ({
      uid,
      ...data,
    }));

    if (queueEntries.length === 0) {
      console.log("No other users in queue, waiting...");
      return;
    }

    // Find compatible matches
    const compatibleMatches = queueEntries.filter((entry) => {
      // Check if users have blocked each other
      const userBlockedPartner = (newUserData.blockedUsers || []).
          includes(entry.uid);
      const partnerBlockedUser = (entry.blockedUsers || []).
          includes(userId);

      if (userBlockedPartner || partnerBlockedUser) {
        return false;
      }

      // Check gender preference compatibility
      const userPrefersAny = newUserData.preference === "any";
      const partnerPrefersAny = entry.preference === "any";

      // If user wants specific gender,
      // check if partner matches AND partner paid for filter
      if (!userPrefersAny && newUserData.usedCoin) {
        const partnerGenderMatches =
            entry.gender === newUserData.preference;
        if (!partnerGenderMatches) {
          return false;
        }
      }

      // If partner wants specific gender,
      // check if user matches AND user paid for filter
      if (!partnerPrefersAny && entry.usedCoin) {
        const userGenderMatches =
            newUserData.gender === entry.preference;
        if (!userGenderMatches) {
          return false;
        }
      }

      return true;
    });

    if (compatibleMatches.length === 0) {
      console.log("No compatible matches found, waiting...");
      return;
    }

    // Try to find match with shared interests (within timeout window)
    const now = Date.now();
    const userInterests = new Set(newUserData.interests || []);
    // Convert to milliseconds
    const searchTimeout = (newUserData.searchTimeout || 30) * 1000;

    let bestMatch = null;

    // Priority 1: Shared interests (if within timeout window)
    if (userInterests.size > 0 &&
        (now - newUserData.timestamp) < searchTimeout) {
      const matchesWithInterests = compatibleMatches
          .map((entry) => {
            const partnerInterests = new Set(entry.interests || []);
            const sharedInterests = [...userInterests].
                filter((i) => partnerInterests.has(i));
            return {
              ...entry,
              sharedInterestsCount: sharedInterests.length,
              sharedInterests,
            };
          })
          .filter((entry) => entry.sharedInterestsCount > 0)
          .sort((a, b) => {
            // Sort by shared interests count (descending),
            // then by timestamp (ascending)
            if (b.sharedInterestsCount !== a.sharedInterestsCount) {
              return b.sharedInterestsCount - a.sharedInterestsCount;
            }
            return a.timestamp - b.timestamp;
          });

      if (matchesWithInterests.length > 0) {
        bestMatch = matchesWithInterests[0];
        console.log(
            `Found match with ${bestMatch.sharedInterestsCount} ` +
            `shared interests:`,
            bestMatch.sharedInterests);
      }
    }

    // Priority 2: Any compatible match (FIFO)
    if (!bestMatch) {
      compatibleMatches.sort((a, b) => a.timestamp - b.timestamp);
      bestMatch = compatibleMatches[0];
      console.log("Found compatible match (no shared interests)");
    }

    const partnerId = bestMatch.uid;

    // Double-check both users are still in queue
    // and not in a chat (race condition protection)
    const [userStillInQueue, partnerStillInQueue, userDoc, partnerDoc] =
        await Promise.all([
          rtdb.ref(`matchmakingQueue/${userId}`).once("value"),
          rtdb.ref(`matchmakingQueue/${partnerId}`).once("value"),
          db.collection("users").doc(userId).get(),
          db.collection("users").doc(partnerId).get(),
        ]);

    if (!userStillInQueue.exists() || !partnerStillInQueue.exists()) {
      console.log(
          "One or both users no longer in queue (race condition)");
      return;
    }

    const currentUserData = userDoc.data();
    const currentPartnerData = partnerDoc.data();

    const userHasChat = currentUserData &&
        currentUserData.currentChatId;
    const partnerHasChat = currentPartnerData &&
        currentPartnerData.currentChatId;
    if (userHasChat || partnerHasChat) {
      console.log(
          "One or both users already in a chat (race condition)");
      // Clean up queue entries
      await Promise.all([
        rtdb.ref(`matchmakingQueue/${userId}`).remove(),
        rtdb.ref(`matchmakingQueue/${partnerId}`).remove(),
      ]);
      return;
    }

    // Create chat document in Firestore
    const chatRef = db.collection("chats").doc();
    const chatId = chatRef.id;

    const chatData = {
      id: chatId,
      participants: [userId, partnerId],
      participantInfo: {
        [userId]: {
          username: currentUserData.username || "Anonymous",
          isTyping: false,
          isViewingProfile: false,
          isSelectingGif: false,
        },
        [partnerId]: {
          username: currentPartnerData.username || "Anonymous",
          isTyping: false,
          isViewingProfile: false,
          isSelectingGif: false,
        },
      },
      startedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    };

    // Atomic operation: Create chat and update both users
    const batch = db.batch();
    batch.set(chatRef, chatData);
    batch.update(db.collection("users").doc(userId),
        {currentChatId: chatId});
    batch.update(db.collection("users").doc(partnerId),
        {currentChatId: chatId});

    await batch.commit();

    // Remove both users from queue
    await Promise.all([
      rtdb.ref(`matchmakingQueue/${userId}`).remove(),
      rtdb.ref(`matchmakingQueue/${partnerId}`).remove(),
    ]);

    console.log(
        `Successfully matched ${userId} with ${partnerId} ` +
        `in chat ${chatId}`);
  } catch (error) {
    console.error("Error in matchmaker:", error);

    // Try to clean up queue entry on error
    try {
      await rtdb.ref(`matchmakingQueue/${userId}`).remove();
    } catch (cleanupError) {
      console.error("Failed to clean up queue entry:", cleanupError);
    }
  }
});
