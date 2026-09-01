import apiClient from './client';

/**
 * Fetch all clinical disease panels and mapped lab tests from the unified DISEASE_REGISTRY.
 * @returns {Promise<Array<{ id: string, disease_key: string, name: string, category: string, description: string, heritability_estimate: number, heritability_range_text: string, clinical_guideline: string, citation: string, primary_biomarkers: string[], primary_biomarkers_detail: Array<{ key: string, display_name: string, standard_unit: string, category: string, description: string }> }>>}
 */
export async function getDiseaseMappings() {
  const response = await apiClient.get('/api/v1/clinical/diseases');
  return response.data;
}

/**
 * Fetch up to 5 most recent reports filtered to disease-relevant biomarkers for a patient.
 * @param {string} userId UUID
 * @param {string} diseaseKey string
 * @returns {Promise<{ disease_key: string, disease_name: string, user_id: string, total_reports_evaluated: number, reports: Array<Object>, biomarker_summaries: Array<Object> }>}
 */
export async function getRecentDiseaseMeasurements(userId, diseaseKey) {
  const response = await apiClient.get(`/api/v1/clinical/patient/${userId}/disease/${diseaseKey}/recent-measurements`);
  return response.data;
}

/**
 * Fetch hybrid disease timeline (confirmed diagnoses + inferred lab episodes) for a patient.
 * @param {string} userId UUID
 * @param {string} diseaseKey string
 * @returns {Promise<Array<{ id: string, event_type: string, is_inferred: boolean, title: string, date: string, status: string, severity: string, notes: string, source_label: string, triggers?: Array<Object> }>>}
 */
export async function getDiseaseTimeline(userId, diseaseKey) {
  const response = await apiClient.get(`/api/v1/clinical/patient/${userId}/disease/${diseaseKey}/timeline`);
  return response.data;
}

/**
 * Add a new medical history or confirmed clinical diagnosis entry.
 * @param {string} userId UUID
 * @param {{ disease_key: string, diagnosis_date: string, record_type?: string, status?: string, notes?: string }} payload
 * @returns {Promise<Object>}
 */
export async function addMedicalHistoryRecord(userId, payload) {
  const response = await apiClient.post(`/api/v1/clinical/patient/${userId}/medical-history`, payload);
  return response.data;
}

/**
 * Delete a medical history record.
 * @param {string} userId UUID
 * @param {string} recordId UUID
 * @returns {Promise<{ status: string, deleted_id: string }>}
 */
export async function deleteMedicalHistoryRecord(userId, recordId) {
  const response = await apiClient.delete(`/api/v1/clinical/patient/${userId}/medical-history/${recordId}`);
  return response.data;
}

/**
 * Fetch disease measurements (5 reports) and history timelines for all linked family members.
 * @param {string} userId UUID
 * @param {string} diseaseKey string
 * @returns {Promise<Array<{ relative_id: string, relative_name: string, relationship_type: string, is_placeholder: boolean, is_managed_placeholder: boolean, is_genetic: boolean, kinship_weight: number, share_clinical_data: boolean, consent_restricted: boolean, restriction_reason?: string, recent_reports: Array<Object>, biomarker_summaries: Array<Object>, timeline: Array<Object> }>>}
 */
export async function getFamilyDiseaseOverview(userId, diseaseKey) {
  const response = await apiClient.get(`/api/v1/clinical/patient/${userId}/disease/${diseaseKey}/family-overview`);
  return response.data;
}

/**
 * Fetch latest test measurements for a patient corresponding to a specific disease panel (legacy).
 * @param {string} userId UUID
 * @param {string} diseaseId string
 * @returns {Promise<Array<{ canonical_test_name: string, latest_value: string, numeric_value: number, unit: string, reference_range: string, abnormality_flag: string, report_date: string }>>}
 */
export async function getPatientDiseaseSummary(userId, diseaseId) {
  const response = await apiClient.get(`/api/v1/clinical/patient/${userId}/disease/${diseaseId}/summary`);
  return response.data;
}

/**
 * Fetch latest disease measurements for a specific linked relative (legacy).
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
 * Fetch cross-family historical values for a specific canonical test across linked family members (legacy).
 * @param {string} userId UUID
 * @param {string} canonicalTestName string
 * @returns {Promise<Array<{ relative_id: string, relative_name: string, relationship_type: string, canonical_test_name: string, value: string, numeric_value: number, unit: string, abnormality_flag: string, report_date: string }>>}
 */
export async function getFamilyBiomarkerHistory(userId, canonicalTestName) {
  const response = await apiClient.get(`/api/v1/clinical/patient/${userId}/family-history/${encodeURIComponent(canonicalTestName)}`);
  return response.data;
}
