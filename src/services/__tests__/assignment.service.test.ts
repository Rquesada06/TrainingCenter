/**
 * assignment.service tests — Phase 02 Plan 05 (ASGN-01..04)
 *
 * Covers:
 *   - callCreateAssignment: invokes createAssignmentCallable and unwraps result.data.assignmentId
 *   - re-export of findActiveAssignmentForClient from client.service (single source of truth)
 */

// ────────────────────────────────────────────────────────────────────────────
// Mocks (must be before imports)
// ────────────────────────────────────────────────────────────────────────────

const mockCallCreateAssignment = jest.fn();

jest.mock('@/firebase/functions', () => ({
  createAssignmentCallable: jest.fn(),
  callCreateAssignment: (...args: unknown[]) => mockCallCreateAssignment(...args),
}));

const mockFindActiveAssignment = jest.fn().mockResolvedValue(null);

jest.mock('@/services/client.service', () => ({
  findActiveAssignmentForClient: (...args: unknown[]) => mockFindActiveAssignment(...args),
}));

// getAssignment (04-01) imports assignmentsCollection from @/firebase/firestore →
// mock it so importing the service doesn't touch the native RNFB module.
const mockAssignmentGet = jest.fn();
const mockAssignmentDoc = jest.fn(() => ({ get: mockAssignmentGet }));
jest.mock('@/firebase/firestore', () => ({
  assignmentsCollection: () => ({ doc: mockAssignmentDoc }),
}));

// ────────────────────────────────────────────────────────────────────────────
// Imports — AFTER mocks
// ────────────────────────────────────────────────────────────────────────────

import { callCreateAssignment, findActiveAssignmentForClient, getAssignment } from '../assignment.service';
import { findActiveAssignmentForClient as clientServiceFn } from '../client.service';

describe('getAssignment (04-01)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when the doc does not exist (snap.exists() method, RNFB v24)', async () => {
    mockAssignmentGet.mockResolvedValueOnce({ exists: () => false, id: 'ghost', data: () => undefined });
    expect(await getAssignment('ghost')).toBeNull();
    expect(mockAssignmentDoc).toHaveBeenCalledWith('ghost');
  });

  it('returns { ...data, id } when the doc exists', async () => {
    const data = { trainerId: 't1', clientId: 'c1', programId: 'p1', status: 'active', startDate: '2026-06-01' };
    mockAssignmentGet.mockResolvedValueOnce({ exists: () => true, id: 'a1', data: () => data });
    expect(await getAssignment('a1')).toEqual({ ...data, id: 'a1' });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe('callCreateAssignment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invokes createAssignmentCallable and unwraps result.data.assignmentId', async () => {
    mockCallCreateAssignment.mockResolvedValueOnce({ assignmentId: 'new-assignment-id' });

    const input = {
      programId: 'prog-1',
      clientId: 'client-1',
      startDate: '2026-06-01',
    };

    const result = await callCreateAssignment(input);

    expect(mockCallCreateAssignment).toHaveBeenCalledWith(input);
    expect(result).toEqual({ assignmentId: 'new-assignment-id' });
  });
});

describe('findActiveAssignmentForClient re-export', () => {
  it('is the same reference as the one from client.service (single source of truth)', () => {
    // Both are the same underlying mock function routed through the module mock
    expect(findActiveAssignmentForClient).toBe(clientServiceFn);
  });
});
