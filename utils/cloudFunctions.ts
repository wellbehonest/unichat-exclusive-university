import { httpsCallable, HttpsCallableResult, connectFunctionsEmulator } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { ref, remove } from 'firebase/database';
import { rtdb, app, auth } from '../services/firebase';

// Initialize Functions with the app instance and region
const functions = getFunctions(app, 'us-central1');

// Type definitions for Cloud Function requests and responses
export interface ReserveMatchRequest {
  preference: 'any' | 'male' | 'female';
  useCoin: boolean;
  interests?: string[];
  searchTimeout?: number;
}

export interface ReserveMatchResponse {
  success: boolean;
  queueId?: string;
  message?: string;
  error?: string;
}

/**
 * Call the reserveMatch Cloud Function to securely join the matchmaking queue
 * 
 * @param data - Matchmaking preferences
 * @returns Promise with result or error
 */
export async function reserveMatchmaking(
  data: ReserveMatchRequest
): Promise<ReserveMatchResponse> {
  try {
    // Get auth token
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const idToken = await user.getIdToken();
    
    // Call function via HTTP
    const response = await fetch(
      'https://us-central1-chattingmap-c97b0.cloudfunctions.net/reserveMatch',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          data,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || 'Failed to reserve match',
      };
    }

    const responseData = await response.json();
    return responseData.result;
  } catch (error: any) {
    console.error('Error calling reserveMatch:', error);
    return {
      success: false,
      error: error.message || 'Failed to join matchmaking queue',
    };
  }
}

/**
 * Cancel matchmaking by removing from queue
 * This is done client-side by deleting the RTDB entry
 */
export async function cancelMatchmaking(userId: string): Promise<void> {
  try {
    await remove(ref(rtdb, `matchmakingQueue/${userId}`));
    console.log('✅ Successfully cancelled matchmaking');
  } catch (error) {
    console.error('❌ Error cancelling matchmaking:', error);
    throw error;
  }
}
