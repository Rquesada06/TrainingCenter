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

const mockCallable = jest.fn();

jest.mock('@/firebase/functions', () => ({
  createAssignmentCallable: mockCallable,
}));

jest.mock('@/services/client.service', () => ({
  findActiveAssignmentForClient: jest.fn().mockResolvedValue(null),
}));

// ────────────────────────────────────────────────────────────────────────────
// Imports — AFTER mocks
// ────────────────────────────────────────────────────────────────────────────

import { callCreateAssignment, findActiveAssignmentForClient } from '../assignment.service';
import { findActiveAssignmentForClient as clientServiceFn } from '../client.service';

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe('callCreateAssignment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invokes createAssignmentCallable and unwraps result.data.assignmentId', async () => {
    mockCallable.mockResolvedValueOnce({ data: { assignmentId: 'new-assignment-id' } });

    const input = {
      programId: 'prog-1',
      clientId: 'client-1',
      startDate: '2026-06-01',
    };

    const result = await callCreateAssignment(input);

    expect(mockCallable).toHaveBeenCalledWith(input);
    expect(result).toEqual({ assignmentId: 'new-assignment-id' });
  });
});

describe('findActiveAssignmentForClient re-export', () => {
  it('is the same reference as the one from client.service (single source of truth)', () => {
    // The re-export must be the exact function from client.service
    expect(findActiveAssignmentForClient).toBe(clientServiceFn);
  });
});
