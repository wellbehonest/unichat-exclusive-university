const {onRequest} = require("firebase-functions/v2/https");
const {getFirestore} = require("firebase-admin/firestore");
const {getDatabase} = require("firebase-admin/database");
const admin = require("firebase-admin");

/**
 * cancelMatch - Cancel matchmaking and refund coin if used
 */
exports.cancelMatch = onRequest(
    {
      cors: [
        "https://chattingmap-c97b0.web.app",
        "https://chattingmap-c97b0.firebaseapp.com",
      ],
    },
    async (req, res) => {
      // Only allow POST
      if (req.method !== "POST") {
        res.status(405).json({error: "Method not allowed"});
        return;
      }

      try {
        // Verify Firebase auth token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          res.status(401).json({error: "Unauthorized"});
          return;
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const db = getFirestore();
        const rtdb = getDatabase();

        // Check if user is in queue and get their queue data
        const queueRef = rtdb.ref(`matchmakingQueue/${userId}`);
        const queueSnapshot = await queueRef.once("value");

        if (!queueSnapshot.exists()) {
          res.status(200).json({
            result: {
              success: true,
              message: "Not in queue",
              refunded: false,
            },
          });
          return;
        }

        const queueData = queueSnapshot.val();
        const usedCoin = queueData.usedCoin || false;

        // Remove from queue
        await queueRef.remove();

        // Refund coin if it was used
        if (usedCoin) {
          const userRef = db.collection("users").doc(userId);

          await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
              throw new Error("User not found");
            }

            const currentCoins = userDoc.data().coins || 0;
            const currentReserved = userDoc.data().reservedCoins || 0;

            // Refund the coin
            transaction.update(userRef, {
              coins: currentCoins + 1,
              reservedCoins: Math.max(0, currentReserved - 1),
            });
          });

          console.log(`✅ Refunded 1 coin to user ${userId}`);

          res.status(200).json({
            result: {
              success: true,
              message: "Matchmaking cancelled, coin refunded",
              refunded: true,
            },
          });
        } else {
          res.status(200).json({
            result: {
              success: true,
              message: "Matchmaking cancelled",
              refunded: false,
            },
          });
        }
      } catch (error) {
        console.error("Error cancelling match:", error);
        res.status(500).json({
          error: error.message || "Failed to cancel matchmaking",
        });
      }
    },
);
