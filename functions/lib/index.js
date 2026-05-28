"use strict";
/**
 * LauFit Cloud Functions — Phase 1
 *
 * createClientAccount: The only path to create a client Firebase Auth user.
 * Uses v1 functions.https.onCall (NOT v2) to avoid auth propagation bugs
 * with @react-native-firebase/functions.httpsCallable() (Pitfall 5).
 *
 * Requires Node.js 18 or 20 (v22 not yet GA on Firebase Functions as of May 2026).
 * Default service account has sufficient IAM for admin.auth().createUser()
 * and admin.firestore().set() — no additional IAM grants needed (Assumption A2).
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClientAccount = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Initialize only if no app has been initialized yet (allows test env to initialize first)
if (!admin.apps.length) {
    admin.initializeApp();
}
/**
 * createClientAccount — v1 onCall
 *
 * Creates a Firebase Auth user AND a users/{uid} Firestore doc atomically.
 * Only trainers can call this function (server-side role check).
 *
 * Security boundary:
 *   - Unauthenticated callers → HttpsError('unauthenticated')
 *   - Non-trainer callers → HttpsError('permission-denied')
 *   - Duplicate email → HttpsError('already-exists')
 *
 * Threat mitigations applied:
 *   T-04-01: Unauthenticated + non-trainer rejection
 *   T-04-03: Auth user creation only via Admin SDK (client SDK cannot do this)
 *   T-04-05: v1 onCall used to ensure context.auth propagates correctly
 */
exports.createClientAccount = functions.https.onCall(async (data, context) => {
    var _a;
    // Step 1: Reject unauthenticated callers
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to create client accounts.');
    }
    // Step 2: Verify caller is a trainer (Firestore role check)
    const callerSnap = await admin
        .firestore()
        .doc(`users/${context.auth.uid}`)
        .get();
    if (((_a = callerSnap.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'trainer') {
        throw new functions.https.HttpsError('permission-denied', 'Only trainers can create client accounts.');
    }
    // Step 3: Create Firebase Auth user via Admin SDK
    let userRecord;
    try {
        userRecord = await admin.auth().createUser({
            email: data.email,
            password: data.temporaryPassword,
            displayName: data.name,
        });
    }
    catch (err) {
        const firebaseError = err;
        throw new functions.https.HttpsError('already-exists', `Auth user creation failed: ${firebaseError.message}`);
    }
    // Step 4: Write USERS doc with role: 'client' and trainerId reference
    await admin.firestore().doc(`users/${userRecord.uid}`).set({
        role: 'client',
        trainerId: context.auth.uid,
        name: data.name,
        email: data.email,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Step 5: Return new client uid to the trainer caller
    const result = { uid: userRecord.uid };
    return result;
});
//# sourceMappingURL=index.js.map