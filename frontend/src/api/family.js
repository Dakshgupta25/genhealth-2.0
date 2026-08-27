import apiClient from './client';

/**
 * Fetch all linked family members for a specific user ID.
 * @param {string} userId UUID
 * @returns {Promise<Array<{ relationship_id: string, relative_id: string, full_name: string, email: string, relationship_type: string, role: string }>>}
 */
export async function getFamilyMembers(userId) {
  const response = await apiClient.get(`/api/v1/family/${userId}`);
  return response.data;
}

/**
 * Link a relative to the user's family tree using their unique User ID.
 * @param {{ user_id: string, relative_user_id: string, relationship_type: string }} payload
 * @returns {Promise<Object>}
 */
export async function linkFamilyMember(payload) {
  const response = await apiClient.post('/api/v1/family/link', payload);
  return response.data;
}

/**
 * Remove / unlink a family relationship.
 * @param {string} relationshipId UUID
 * @returns {Promise<void>}
 */
export async function unlinkFamilyMember(relationshipId) {
  await apiClient.delete(`/api/v1/family/${relationshipId}`);
}
