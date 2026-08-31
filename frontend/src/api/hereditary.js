import apiClient from './client';

/**
 * Fetch supported hereditary disease registry metadata.
 * @returns {Promise<Array<Object>>}
 */
export async function getHereditaryDiseaseRegistry() {
  const response = await apiClient.get('/api/v1/hereditary-risk/diseases');
  return response.data;
}

/**
 * Fetch computed hereditary disease risk assessment for a target patient.
 * @param {string} userId UUID
 * @param {Array<string>} [diseaseKeys] Optional array of target disease keys
 * @param {boolean} [enableLlm=true] Enable Gemini clinical narrative
 * @returns {Promise<Object>} HereditaryRiskAssessmentResponse
 */
export async function getPatientHereditaryAssessment(userId, diseaseKeys = null, enableLlm = true) {
  const params = new URLSearchParams();
  if (diseaseKeys && Array.isArray(diseaseKeys) && diseaseKeys.length > 0) {
    diseaseKeys.forEach((key) => params.append('disease', key));
  }
  params.append('enable_llm', enableLlm.toString());

  const response = await apiClient.get(`/api/v1/hereditary-risk/patient/${userId}/assessment?${params.toString()}`);
  return response.data;
}
