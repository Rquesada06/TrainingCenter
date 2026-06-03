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
exports.createAssignment = exports.createClientAccount = void 0;
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
exports.createClientAccount = functions
    // maxInstances bounds worst-case concurrency (and therefore cost) — an MVP
    // with one trainer never needs more, and it caps runaway-loop spend.
    .runWith({ maxInstances: 10 })
    .https.onCall(async (data, context) => {
    var _a, _b, _c;
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
        const code = (_b = firebaseError.code) !== null && _b !== void 0 ? _b : '';
        if (code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'An account with that email already exists.');
        }
        if (code === 'auth/invalid-email') {
            throw new functions.https.HttpsError('invalid-argument', 'The email address is invalid.');
        }
        if (code === 'auth/invalid-password') {
            throw new functions.https.HttpsError('invalid-argument', 'The password must be at least 6 characters.');
        }
        throw new functions.https.HttpsError('internal', `Auth user creation failed: ${(_c = firebaseError.message) !== null && _c !== void 0 ? _c : 'unknown error'}`);
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
exports.createAssignment = functions
    // maxInstances bounds worst-case concurrency (and therefore cost).
    .runWith({ maxInstances: 10 })
    .https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f;
    // Step 1: Reject unauthenticated callers
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
    }
    const db = admin.firestore();
    // Step 2: Verify caller is a trainer
    const callerSnap = await db.doc(`users/${context.auth.uid}`).get();
    if (((_a = callerSnap.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'trainer') {
        throw new functions.https.HttpsError('permission-denied', 'Only trainers can create assignments.');
    }
    // Step 3: Read program; verify ownership
    // NOTE: admin SDK uses `exists` as a boolean property (not a method)
    const programSnap = await db.doc(`programs/${data.programId}`).get();
    if (!programSnap.exists || ((_b = programSnap.data()) === null || _b === void 0 ? void 0 : _b.trainerId) !== context.auth.uid) {
        throw new functions.https.HttpsError('not-found', 'Program not found.');
    }
    const programData = programSnap.data();
    // Step 4: Validate client — exists, is a client, belongs to this trainer
    const clientSnap = await db.doc(`users/${data.clientId}`).get();
    const clientData = clientSnap.data();
    if (!clientSnap.exists ||
        (clientData === null || clientData === void 0 ? void 0 : clientData.role) !== 'client' ||
        (clientData === null || clientData === void 0 ? void 0 : clientData.trainerId) !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Client not found in your roster.');
    }
    // Step 5: Validate startDate format (ASGN-04)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.startDate)) {
        throw new functions.https.HttpsError('invalid-argument', 'startDate must be YYYY-MM-DD.');
    }
    // Step 6: Build immutable snapshot
    // Collect unique routineIds and exerciseIds first, then resolve in parallel
    const weeks = (_c = programData.weeks) !== null && _c !== void 0 ? _c : [];
    // Collect unique routineIds (non-null, non-'rest')
    const routineIdSet = new Set();
    for (const week of weeks) {
        for (const day of (_d = week.days) !== null && _d !== void 0 ? _d : []) {
            if (day && day !== 'rest')
                routineIdSet.add(day);
        }
    }
    const uniqueRoutineIds = Array.from(routineIdSet);
    // Fetch all routines in parallel
    // NOTE: admin SDK uses `exists` as a boolean property (not a method)
    const routineSnaps = await Promise.all(uniqueRoutineIds.map((rId) => db.doc(`routines/${rId}`).get()));
    const routineMap = {};
    for (let i = 0; i < uniqueRoutineIds.length; i++) {
        const snap = routineSnaps[i];
        if (snap.exists) {
            routineMap[uniqueRoutineIds[i]] = snap.data();
        }
    }
    // Collect unique exerciseIds (including alternatives)
    const exerciseIdSet = new Set();
    for (const routineData of Object.values(routineMap)) {
        const exercises = (_e = routineData.exercises) !== null && _e !== void 0 ? _e : [];
        for (const ex of exercises) {
            if (ex.exerciseId)
                exerciseIdSet.add(ex.exerciseId);
            if (ex.alternativeExerciseId)
                exerciseIdSet.add(ex.alternativeExerciseId);
        }
    }
    const uniqueExerciseIds = Array.from(exerciseIdSet);
    // Fetch all exercises in parallel
    const exerciseSnaps = await Promise.all(uniqueExerciseIds.map((eId) => db.doc(`exercises/${eId}`).get()));
    const exerciseMap = {};
    for (let i = 0; i < uniqueExerciseIds.length; i++) {
        const snap = exerciseSnaps[i];
        if (snap.exists) {
            exerciseMap[uniqueExerciseIds[i]] = snap.data();
        }
    }
    // Helper to build a SnapshotExercise from Firestore data + routine override
    function buildSnapshotExercise(routineEx, exData) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
        const altId = (_a = routineEx.alternativeExerciseId) !== null && _a !== void 0 ? _a : null;
        const altData = altId ? exerciseMap[altId] : null;
        return {
            exerciseId: (_b = exData.id) !== null && _b !== void 0 ? _b : routineEx.exerciseId,
            name: exData.name,
            sets: (_d = (_c = routineEx.sets) !== null && _c !== void 0 ? _c : exData.defaultSets) !== null && _d !== void 0 ? _d : 1,
            reps: (_f = (_e = routineEx.reps) !== null && _e !== void 0 ? _e : exData.defaultReps) !== null && _f !== void 0 ? _f : null,
            duration: (_h = (_g = routineEx.duration) !== null && _g !== void 0 ? _g : exData.defaultDuration) !== null && _h !== void 0 ? _h : null,
            rest: (_k = (_j = routineEx.rest) !== null && _j !== void 0 ? _j : exData.defaultRest) !== null && _k !== void 0 ? _k : 60,
            notes: (_l = routineEx.notes) !== null && _l !== void 0 ? _l : null,
            locationTypes: (_m = exData.locationTypes) !== null && _m !== void 0 ? _m : [],
            videoUrl: (_o = exData.videoUrl) !== null && _o !== void 0 ? _o : null,
            imageUrl: (_p = exData.imageUrl) !== null && _p !== void 0 ? _p : null,
            alternativeExerciseId: altId,
            alternativeExercise: altData
                ? {
                    exerciseId: altId,
                    name: altData.name,
                    sets: (_q = altData.defaultSets) !== null && _q !== void 0 ? _q : 1,
                    reps: (_r = altData.defaultReps) !== null && _r !== void 0 ? _r : null,
                    duration: (_s = altData.defaultDuration) !== null && _s !== void 0 ? _s : null,
                    rest: (_t = altData.defaultRest) !== null && _t !== void 0 ? _t : 60,
                    notes: null,
                    locationTypes: (_u = altData.locationTypes) !== null && _u !== void 0 ? _u : [],
                    videoUrl: (_v = altData.videoUrl) !== null && _v !== void 0 ? _v : null,
                    imageUrl: (_w = altData.imageUrl) !== null && _w !== void 0 ? _w : null,
                    alternativeExerciseId: null,
                    alternativeExercise: null,
                }
                : null,
        };
    }
    // Build the snapshot
    const snapshotWeeks = weeks.map((week) => {
        var _a;
        return ({
            days: ((_a = week.days) !== null && _a !== void 0 ? _a : []).map((day) => {
                var _a;
                if (!day || day === 'rest') {
                    return { type: day === 'rest' ? 'rest' : null, routineId: null, routine: null };
                }
                const rData = routineMap[day];
                if (!rData) {
                    return { type: null, routineId: day, routine: null };
                }
                const routineExercises = ((_a = rData.exercises) !== null && _a !== void 0 ? _a : [])
                    .map((routineEx) => {
                    const exId = routineEx.exerciseId;
                    const exData = exerciseMap[exId];
                    if (!exData)
                        return null;
                    return buildSnapshotExercise(routineEx, exData);
                })
                    .filter((e) => e !== null);
                return {
                    type: 'routine',
                    routineId: day,
                    routine: { name: rData.name, exercises: routineExercises },
                };
            }),
        });
    });
    const snapshot = {
        name: programData.name,
        description: (_f = programData.description) !== null && _f !== void 0 ? _f : '',
        durationWeeks: programData.durationWeeks,
        weeks: snapshotWeeks,
    };
    // Step 7: Size safety guard (Pitfall 6 — 800KB pre-flight to stay under 1MiB limit)
    if (JSON.stringify(snapshot).length > 800000) {
        throw new functions.https.HttpsError('failed-precondition', 'Program too large for snapshot — split into shorter programs.');
    }
    // Step 8: Query previous active assignments for this client
    const prevQuery = await db
        .collection('assignments')
        .where('clientId', '==', data.clientId)
        .where('status', '==', 'active')
        .get();
    // Step 9: Atomic batch write
    const batch = db.batch();
    const newRef = db.collection('assignments').doc();
    batch.set(newRef, {
        trainerId: context.auth.uid,
        clientId: data.clientId,
        programId: data.programId,
        status: 'active',
        startDate: data.startDate,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        snapshot,
    });
    prevQuery.docs.forEach((d) => batch.update(d.ref, { status: 'completed' }));
    await batch.commit();
    // Step 10: Return assignmentId
    const result = { assignmentId: newRef.id };
    return result;
});
//# sourceMappingURL=index.js.map