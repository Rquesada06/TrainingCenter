"use strict";
/**
 * Emulator tests for createClientAccount Cloud Function.
 *
 * Run with:
 *   firebase emulators:exec --only auth,firestore "npx jest --testPathPattern=createClientAccount"
 *
 * These tests run against the Firebase Emulator Suite (auth + firestore).
 * They require FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST env vars
 * to be set, which firebase emulators:exec provides automatically.
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
const admin = __importStar(require("firebase-admin"));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const functions = require('firebase-functions-test');
// Set up emulator environment before importing the function
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
// Initialize the Firebase Functions test SDK
const testEnv = functions({
    projectId: 'laufit-emulator-test',
});
// Initialize admin SDK for test setup/teardown
if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'laufit-emulator-test' });
}
const db = admin.firestore();
const auth = admin.auth();
// Import the wrapped function after setting up emulators
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClientAccount } = require('../index');
const wrappedCreateClientAccount = testEnv.wrap(createClientAccount);
describe('createClientAccount Cloud Function', () => {
    const trainerUid = 'trainer-uid-123';
    const clientUid = 'client-uid-456';
    beforeEach(async () => {
        // Set up a trainer user in Firestore for the role check
        await db.doc(`users/${trainerUid}`).set({
            role: 'trainer',
            name: 'Test Trainer',
            email: 'trainer@test.com',
            trainerId: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Set up a client user in Firestore for the role check
        await db.doc(`users/${clientUid}`).set({
            role: 'client',
            name: 'Test Client',
            email: 'existing@test.com',
            trainerId: trainerUid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    afterEach(async () => {
        // Clean up Firestore
        const usersSnap = await db.collection('users').get();
        const batch = db.batch();
        usersSnap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        // Clean up Auth users created during tests
        try {
            const listResult = await auth.listUsers();
            for (const user of listResult.users) {
                await auth.deleteUser(user.uid);
            }
        }
        catch (_a) {
            // Ignore cleanup errors
        }
    });
    afterAll(() => {
        testEnv.cleanup();
    });
    test('trainer creates client account — returns uid, creates Auth user and Firestore doc', async () => {
        const data = {
            name: 'New Client',
            email: 'newclient@test.com',
            temporaryPassword: 'TempPass123!',
        };
        const context = {
            auth: {
                uid: trainerUid,
                token: {},
            },
        };
        const result = await wrappedCreateClientAccount(data, context);
        expect(result).toHaveProperty('uid');
        expect(typeof result.uid).toBe('string');
        expect(result.uid.length).toBeGreaterThan(0);
        // Verify Auth user was created
        const authUser = await auth.getUserByEmail(data.email);
        expect(authUser.displayName).toBe(data.name);
        expect(authUser.uid).toBe(result.uid);
        // Verify Firestore doc was created
        const userDoc = await db.doc(`users/${result.uid}`).get();
        expect(userDoc.exists).toBe(true);
        const userData = userDoc.data();
        expect(userData === null || userData === void 0 ? void 0 : userData.role).toBe('client');
        expect(userData === null || userData === void 0 ? void 0 : userData.trainerId).toBe(trainerUid);
        expect(userData === null || userData === void 0 ? void 0 : userData.name).toBe(data.name);
        expect(userData === null || userData === void 0 ? void 0 : userData.email).toBe(data.email);
    });
    test('authenticated client caller — throws permission-denied', async () => {
        const data = {
            name: 'Another Client',
            email: 'another@test.com',
            temporaryPassword: 'TempPass123!',
        };
        const context = {
            auth: {
                uid: clientUid,
                token: {},
            },
        };
        await expect(wrappedCreateClientAccount(data, context)).rejects.toMatchObject({
            code: 'permission-denied',
        });
    });
    test('unauthenticated caller — throws unauthenticated', async () => {
        const data = {
            name: 'Any Client',
            email: 'any@test.com',
            temporaryPassword: 'TempPass123!',
        };
        const context = {};
        await expect(wrappedCreateClientAccount(data, context)).rejects.toMatchObject({
            code: 'unauthenticated',
        });
    });
    test('duplicate email — throws already-exists', async () => {
        // First create the email in Auth
        await auth.createUser({
            email: 'duplicate@test.com',
            password: 'SomePass123!',
            displayName: 'Existing User',
        });
        const data = {
            name: 'Duplicate',
            email: 'duplicate@test.com',
            temporaryPassword: 'TempPass123!',
        };
        const context = {
            auth: {
                uid: trainerUid,
                token: {},
            },
        };
        await expect(wrappedCreateClientAccount(data, context)).rejects.toMatchObject({
            code: 'already-exists',
        });
    });
});
//# sourceMappingURL=createClientAccount.test.js.map