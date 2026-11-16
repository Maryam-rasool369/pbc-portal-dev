import React from "react";
import { Modal } from "flowbite-react";

type StepStatus = "completed" | "in_progress" | "pending" | "rejected";

interface MembershipApplicationSubStep {
  key: string;
  label: string;
  status: StepStatus;
}

interface MembershipApplicationStep {
  step: number;
  key: string;
  label: string;
  status: StepStatus;
  completedAt?: string | null;
  subSteps?: MembershipApplicationSubStep[];
}

interface MembershipApplicationStatus {
  currentStep: number;
  overallStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  steps: MembershipApplicationStep[];
}

interface User {
  id: number | string;
  name: string;
  membershipApplicationStatus?: MembershipApplicationStatus;
}

interface MembershipApplicationStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

const StatusIcon: React.FC<{ status: StepStatus }> = ({ status }) => {
  switch (status) {
    case "completed":
      return (
        <div className="h-7 w-7 rounded-full bg-green-500 flex items-center justify-center shrink-0">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      );
    case "in_progress":
      return (
        <div className="h-7 w-7 rounded-full border-2 border-gold-500 flex items-center justify-center shrink-0">
          <div className="h-2.5 w-2.5 rounded-full bg-gold-500 animate-pulse"></div>
        </div>
      );
    case "rejected":
      return (
        <div className="h-7 w-7 rounded-full bg-red-500 flex items-center justify-center shrink-0">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
      );
    default:
      return (
        <div className="h-7 w-7 rounded-full border-2 border-gray-500 flex items-center justify-center shrink-0">
          <div className="h-2 w-2 rounded-full bg-gray-500"></div>
        </div>
      );
  }
};

const StatusBadge: React.FC<{ status: StepStatus }> = ({ status }) => {
  const config: Record<StepStatus, { label: string; classes: string }> = {
    completed: {
      label: "Completed",
      classes:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    },
    in_progress: {
      label: "In Progress",
      classes: "bg-gold-100 text-gold-800 dark:bg-gold-900 dark:text-gold-200",
    },
    pending: {
      label: "Pending",
      classes: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
    },
    rejected: {
      label: "Rejected",
      classes: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    },
  };

  const { label, classes } = config[status];

  return (
    <span
      className={`inline-block px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${classes}`}
    >
      {label}
    </span>
  );
};

const MembershipApplicationStatusModal: React.FC<
  MembershipApplicationStatusModalProps
> = ({ isOpen, onClose, user }) => {
  const status = user?.membershipApplicationStatus;
  const steps = status?.steps ?? [];

  const overallStatusText: Record<string, string> = {
    NOT_STARTED: "Not Started",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    REJECTED: "Rejected",
  };

  const overallClasses =
    status?.overallStatus === "COMPLETED"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : status?.overallStatus === "REJECTED"
        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
        : status?.overallStatus === "IN_PROGRESS"
          ? "bg-gold-100 text-gold-800 dark:bg-gold-900 dark:text-gold-200"
          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";

  return (
    <Modal show={isOpen} onClose={onClose} size="lg" dismissible>
      <Modal.Header className="border-b border-gray-700 bg-gray-900 text-white">
        Membership Application Status
      </Modal.Header>
      <Modal.Body className="bg-gray-900 text-white max-h-[80vh] overflow-y-auto">
        {!status || steps.length === 0 ? (
          <div className="flex justify-center items-center h-40">
            <p className="text-gray-400">
              No membership application status available.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-800 p-4 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Applicant</p>
                <p className="text-lg font-semibold">{user?.name}</p>
              </div>
              <span
                className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${overallClasses}`}
              >
                {overallStatusText[status.overallStatus] ?? "In Progress"}
              </span>
            </div>

            <div className="relative">
              {steps.map((step, index) => (
                <div key={step.key} className="relative flex pb-8 last:pb-0">
                  {index < steps.length - 1 && (
                    <div className="absolute top-7 left-3.5 bottom-0 w-0.5 bg-gray-700"></div>
                  )}
                  <div className="relative">
                    <StatusIcon status={step.status} />
                  </div>
                  <div className="ml-4 flex-1 pt-0.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-medium text-white">
                          {step.step}. {step.label}
                        </p>
                        {step.completedAt && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(step.completedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={step.status} />
                    </div>

                    {step.subSteps && step.subSteps.length > 0 && (
                      <div className="mt-3 ml-3 space-y-2 border-l-2 border-gray-700 pl-4">
                        {step.subSteps.map((subStep) => (
                          <div
                            key={subStep.key}
                            className="flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2">
                              {subStep.status === "completed" ? (
                                <svg
                                  className="w-4 h-4 text-green-500"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="3"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              ) : subStep.status === "in_progress" ? (
                                <div className="w-4 h-4 rounded-full border-2 border-gold-500 flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse"></div>
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-gray-600"></div>
                              )}
                              <span className="text-sm text-gray-300">
                                {subStep.label}
                              </span>
                            </div>
                            <StatusBadge status={subStep.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default MembershipApplicationStatusModal;
