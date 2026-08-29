import apiClient from './client';

/**
 * Fetch all linked family members for a specific user ID.
 * @param {string} userId UUID
 * @returns {Promise<Array<Object>>}
 */
export async function getFamilyMembers(userId) {
  const response = await apiClient.get(`/api/v1/family/${userId}`);
  return response.data;
}

/**
 * Fetch full hierarchical tree grouped by generational tiers.
 * @param {string} userId UUID
 * @returns {Promise<{ self_node: Object, grandparents: Array, parents: Array, peers: Array, children: Array, extended: Array, all_members: Array }>}
 */
export async function getFamilyTree(userId) {
  const response = await apiClient.get(`/api/v1/family/${userId}/tree`);
  return response.data;
}

/**
 * Link an existing relative by their unique User ID with bidirectional sync.
 * @param {{ user_id: string, relative_user_id: string, relationship_type: string, share_clinical_data?: boolean }} payload
 * @returns {Promise<Object>}
 */
export async function linkFamilyMember(payload) {
  const response = await apiClient.post('/api/v1/family/link', payload);
  return response.data;
}

/**
 * Create a managed placeholder profile for a family member without an account.
 * @param {{ manager_user_id: string, full_name: string, relationship_type: string, gender?: string, avatar_url?: string }} payload
 * @returns {Promise<Object>}
 */
export async function createPlaceholderProfile(payload) {
  const response = await apiClient.post('/api/v1/family/placeholder', payload);
  return response.data;
}

/**
 * Update member avatar, name, or metadata.
 * @param {string} relativeId UUID
 * @param {{ manager_user_id: string, full_name?: string, gender?: string, avatar_url?: string }} payload
 * @returns {Promise<Object>}
 */
export async function updateFamilyMember(relativeId, payload) {
  const response = await apiClient.patch(`/api/v1/family/member/${relativeId}`, payload);
  return response.data;
}

/**
 * Toggle clinical data sharing consent for a relationship.
 * @param {string} relationshipId UUID
 * @param {{ user_id: string, share_clinical_data: boolean }} payload
 * @returns {Promise<Object>}
 */
export async function updateSharingConsent(relationshipId, payload) {
  const response = await apiClient.patch(`/api/v1/family/relationship/${relationshipId}/consent`, payload);
  return response.data;
}

/**
 * Remove / unlink a family relationship atomically.
 * @param {string} relationshipId UUID
 * @returns {Promise<void>}
 */
export async function unlinkFamilyMember(relationshipId) {
  await apiClient.delete(`/api/v1/family/${relationshipId}`);
}
