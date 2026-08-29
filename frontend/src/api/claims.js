import apiClient from './client';

/**
 * Fetch pending claim requests for a given user (either as manager or claimant).
 * @param {string} userId UUID
 * @returns {Promise<Array<Object>>}
 */
export async function getPendingClaims(userId) {
  const response = await apiClient.get(`/api/v1/claims/pending/${userId}`);
  return response.data;
}

/**
 * Manager approves a pending profile claim request.
 * @param {string} claimId UUID
 * @param {string} managerUserId UUID
 * @returns {Promise<Object>}
 */
export async function approveClaim(claimId, managerUserId) {
  const response = await apiClient.post(`/api/v1/claims/${claimId}/approve`, {
    user_id: managerUserId,
  });
  return response.data;
}

/**
 * Manager rejects a pending profile claim request.
 * @param {string} claimId UUID
 * @param {string} managerUserId UUID
 * @returns {Promise<Object>}
 */
export async function rejectClaim(claimId, managerUserId) {
  const response = await apiClient.post(`/api/v1/claims/${claimId}/reject`, {
    user_id: managerUserId,
  });
  return response.data;
}

/**
 * Claimant abandons a pending claim to create an independent account instead.
 * @param {string} claimId UUID
 * @param {string} claimantUserId UUID
 * @returns {Promise<Object>}
 */
export async function abandonClaim(claimId, claimantUserId) {
  const response = await apiClient.post(`/api/v1/claims/${claimId}/abandon`, {
    user_id: claimantUserId,
  });
  return response.data;
}
