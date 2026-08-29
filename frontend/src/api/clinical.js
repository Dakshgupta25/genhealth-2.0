import apiClient from './client';

/**
 * Fetch all clinical disease panels and mapped lab tests.
 * @returns {Promise<Array<{ id: string, name: string, category: string, description: string, primary_tests: string[] }>>}
 */
export async function getDiseaseMappings() {
  const response = await apiClient.get('/api/v1/clinical/diseases');
  return response.data;
}

/**
 * Fetch latest test measurements for a patient corresponding to a specific disease panel.
 * @param {string} userId UUID
 * @param {string} diseaseId string
 * @returns {Promise<Array<{ canonical_test_name: string, latest_value: string, numeric_value: number, unit: string, reference_range: string, abnormality_flag: string, report_date: string }>>}
 */
export async function getPatientDiseaseSummary(userId, diseaseId) {
  const response = await apiClient.get(`/api/v1/clinical/patient/${userId}/disease/${diseaseId}/summary`);
  return response.data;
}

/**
 * Fetch latest disease measurements for a specific linked relative.
 * @param {string} userId UUID
 * @param {string} relativeId UUID
 * @param {string} diseaseId string
 * @returns {Promise<Array<Object>>}
 */
export async function getRelativeDiseaseSummary(userId, relativeId, diseaseId) {
  const response = await apiClient.get(`/api/v1/clinical/patient/${userId}/relative/${relativeId}/disease/${diseaseId}/summary`);
  return response.data;
}

/**
 * Fetch cross-family historical values for a specific canonical test across linked family members.
 * @param {string} userId UUID
 * @param {string} canonicalTestName string
 * @returns {Promise<Array<{ relative_id: string, relative_name: string, relationship_type: string, canonical_test_name: string, value: string, numeric_value: number, unit: string, abnormality_flag: string, report_date: string }>>}
 */
export async function getFamilyBiomarkerHistory(userId, canonicalTestName) {
  const response = await apiClient.get(`/api/v1/clinical/patient/${userId}/family-history/${encodeURIComponent(canonicalTestName)}`);
  return response.data;
}
