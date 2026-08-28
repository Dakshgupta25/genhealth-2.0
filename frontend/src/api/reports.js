import apiClient from './client';

/**
 * Upload a lab report file (image/PDF) to trigger extraction + normalization + NER.
 * @param {File} file
 * @param {string} userId UUID
 * @returns {Promise<{ report_id: string, status: string, result_count: number, entity_count: number, model_used: string }>}
 */
export async function ingestReportFile(file, userId) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post(`/api/v1/reports/ingest`, formData, {
    params: { user_id: userId },
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

/**
 * Fetch all extracted lab test results for a given report.
 * @param {string} reportId UUID
 * @returns {Promise<Array>}
 */
export async function getReportResults(reportId) {
  const response = await apiClient.get(`/api/v1/reports/${reportId}/results`);
  return response.data;
}

/**
 * Save / commit updated and user-verified measurements for an existing report.
 * @param {string} reportId UUID
 * @param {Array<{ raw_test_name: string, value: string, unit?: string, reference_range?: string, canonical_test_name?: string, abnormality_flag?: string }>} results
 * @returns {Promise<Array>}
 */
export async function updateReportResults(reportId, results) {
  const response = await apiClient.put(`/api/v1/reports/${reportId}/results`, { results });
  return response.data;
}

/**
 * Create a new manual report record with user-entered measurements.
 * @param {{ user_id: string, original_filename?: string, results: Array }} payload
 * @returns {Promise<{ report_id: string, status: string, result_count: number }>}
 */
export async function createManualReport(payload) {
  const response = await apiClient.post(`/api/v1/reports/manual`, payload);
  return response.data;
}

/**
 * Fetch longitudinal trend history for a specific canonical test across a user's reports.
 * @param {string} userId UUID
 * @param {string} canonicalTestName
 * @returns {Promise<Array>}
 */
export async function getTestTrend(userId, canonicalTestName) {
  const response = await apiClient.get(`/api/v1/reports/users/${userId}/trend/${encodeURIComponent(canonicalTestName)}`);
  return response.data;
}

/**
 * Fetch a summary list of recent reports uploaded by the user.
 * @param {string} userId UUID
 * @returns {Promise<Array<{ id: string, original_filename: string, file_mime_type: string, status: string, created_at: string, result_count: number }>>}
 */
export async function getUserRecentReports(userId) {
  const response = await apiClient.get(`/api/v1/reports/users/${userId}/recent`);
  return response.data;
}

/**
 * Rename an existing lab report.
 * @param {string} reportId UUID
 * @param {string} originalFilename
 * @returns {Promise<{ id: string, original_filename: string, file_mime_type: string, status: string, created_at: string, result_count: number }>}
 */
export async function updateReportName(reportId, originalFilename) {
  const response = await apiClient.patch(`/api/v1/reports/${reportId}/name`, {
    original_filename: originalFilename,
  });
  return response.data;
}


