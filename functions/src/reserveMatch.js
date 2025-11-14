const {onRequest} = require("firebase-functions/v2/https");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {getDatabase} = require("firebase-admin/database");
const admin = require("firebase-admin");

/**
 * reserveMatch - Securely reserve a spot in the matchmaking queue
 */
exports.reserveMatch = onRequest(
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

        const {
          preference,
          useCoin,
          interests = [],
          searchTimeout = 30,
        } = req.body.data;

        // Validate input
        const validPreferences = ["any", "male", "female"];
        if (!preference || !validPreferences.includes(preference)) {
          res.status(400).json({error: "Invalid gender preference"});
          return;
        }

        const db = getFirestore();
        const rtdb = getDatabase();

        // Check if user already has an active chat
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
          res.status(404).json({error: "User profile not found"});
          return;
        }

        const userData = userDoc.data();

        // Check if user is already in a chat
        if (userData.currentChatId) {
          res.status(409).json({error: "Already in a chat"});
          return;
        }

        // Check if user is already in the queue
        const queueRef = rtdb.ref(`matchmakingQueue/${userId}`);
        const existingQueue = await queueRef.once("value");
        if (existingQueue.exists()) {
          res.status(409).json({error: "Already in queue"});
          return;
        }

        // If requesting gender filter, validate and deduct coin
        if (preference !== "any" && useCoin) {
          const coins = userData.coins || 0;
          if (coins < 1) {
            res.status(402).json({error: "Insufficient coins"});
            return;
          }

          // Deduct coin atomically
          await db.collection("users").doc(userId).update({
            coins: FieldValue.increment(-1),
          });
        } else if (preference !== "any" && !useCoin) {
          res.status(402).json({error: "Gender filter requires 1 coin"});
          return;
        }

        // Create queue entry in RTDB
        const queueData = {
          uid: userId,
          timestamp: Date.now(),
          preference: preference,
          gender: userData.gender || "other",
          interests: interests || userData.interests || [],
          usedCoin: preference !== "any" && useCoin,
          blocked: userData.blocked || [],
          searchTimeout: searchTimeout,
        };

        await queueRef.set(queueData);

        res.status(200).json({
          result: {
            success: true,
            queueId: userId,
            message: "Entered matchmaking queue",
          },
        });
      } catch (error) {
        console.error("Reserve match error:", error);
        res.status(500).json({error: "Internal server error"});
      }
    });
