import api from "./client";

/**
 * Deletes a specific report submission.
 * @param submissionId The ID of the report submission to delete.
 */
export const deleteReportSubmission = async (submissionId: number): Promise<void> => {
  await api.delete(`/report-submissions/${submissionId}`);
};
