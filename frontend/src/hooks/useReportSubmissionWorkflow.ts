import { useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import {
  approveReportSubmission,
  rejectReportSubmission,
  type ReportSubmissionSummary,
} from "../api/reportSubmissions";
import { usePendingReportSubmissions } from "./usePendingReportSubmissions";
import { useMyReportSubmissions } from "./useMyReportSubmissions";

type UseReportSubmissionWorkflowOptions = {
  canApproveReports: boolean;
  onError?: (message: string) => void;
};

export const useReportSubmissionWorkflow = ({
  canApproveReports,
  onError,
}: UseReportSubmissionWorkflowOptions) => {
  const pendingReportsQuery = usePendingReportSubmissions({ enabled: canApproveReports });
  const myReportsQuery = useMyReportSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<ReportSubmissionSummary | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [approvingSubmissionId, setApprovingSubmissionId] = useState<number | null>(null);
  const [rejectingSubmissionId, setRejectingSubmissionId] = useState<number | null>(null);

  const pendingReports = pendingReportsQuery.data ?? [];
  const myReports = myReportsQuery.data ?? [];

  const handleWorkflowError = useCallback(
    (message: string) => {
      if (onError) {
        onError(message);
      } else {
        console.error(message);
      }
    },
    [onError],
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setSelectedSubmission(null);
  }, []);

  const openModal = useCallback((submission: ReportSubmissionSummary) => {
    setSelectedSubmission(submission);
    setModalOpen(true);
  }, []);

  const refetchSubmissions = useCallback(() => {
    pendingReportsQuery.refetch();
    myReportsQuery.refetch();
  }, [pendingReportsQuery, myReportsQuery]);

  const approveMutation = useMutation({
    mutationFn: approveReportSubmission,
    onMutate: (submissionId: number) => {
      setApprovingSubmissionId(submissionId);
    },
    onSuccess: (_data, submissionId) => {
      refetchSubmissions();
      if (selectedSubmission?.id === submissionId) {
        closeModal();
      }
    },
    onError: (error: unknown) => {
      const errorMessage =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to approve submission.";
      handleWorkflowError(errorMessage);
    },
    onSettled: () => {
      setApprovingSubmissionId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ submissionId, notes }: { submissionId: number; notes: string }) =>
      rejectReportSubmission(submissionId, notes),
    onMutate: ({ submissionId }) => {
      setRejectingSubmissionId(submissionId);
    },
    onSuccess: (_data, variables) => {
      refetchSubmissions();
      if (selectedSubmission?.id === variables.submissionId) {
        closeModal();
      }
    },
    onError: (error: unknown) => {
      const errorMessage =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to return submission.";
      handleWorkflowError(errorMessage);
    },
    onSettled: () => {
      setRejectingSubmissionId(null);
    },
  });

  const handleApproveSubmission = useCallback(
    (submissionId: number) => {
      if (approvingSubmissionId) return;
      approveMutation.mutate(submissionId);
    },
    [approvingSubmissionId, approveMutation],
  );

  const handleRejectSubmission = useCallback(
    (submissionId: number, notes: string) => {
      if (rejectingSubmissionId || !notes.trim()) return;
      rejectMutation.mutate({ submissionId, notes: notes.trim() });
    },
    [rejectingSubmissionId, rejectMutation],
  );

  return {
    pendingReports,
    myReports,
    selectedSubmission,
    isSubmissionModalOpen: isModalOpen,
    openSubmissionModal: openModal,
    closeSubmissionModal: closeModal,
    handleApproveSubmission,
    handleRejectSubmission,
    approvingSubmissionId,
    rejectingSubmissionId,
    refetchSubmissions,
  };
};
