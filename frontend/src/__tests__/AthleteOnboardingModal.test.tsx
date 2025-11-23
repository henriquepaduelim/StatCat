import { render, screen, fireEvent } from "@testing-library/react";

import AthleteOnboardingModal from "../components/AthleteOnboardingModal";

const defaultCallbacks = {
  onStepOneSuccess: vi.fn(),
  onStepTwoSuccess: vi.fn(),
  onSkipStepTwo: vi.fn(),
  onSubmitForApproval: vi.fn(),
  onBackToStepTwo: vi.fn(),
  onClosePendingReview: vi.fn(),
  onCloseAll: vi.fn(),
};

const renderModal = (step: 1 | 2 | 3 | 4 | null, overrides?: Partial<typeof defaultCallbacks>) =>
  render(
    <AthleteOnboardingModal
      step={step}
      createdAthlete={step === 2 ? { id: 1, first_name: "Test", last_name: "Athlete" } : null}
      error={null}
      isSubmitPending={false}
      {...defaultCallbacks}
      {...overrides}
    />,
  );

describe("AthleteOnboardingModal", () => {
  it("renders nothing when step is null", () => {
    const { container } = renderModal(null);
    expect(container.firstChild).toBeNull();
  });

  it("renders pending review UI and handles close action", () => {
    const onClosePendingReview = vi.fn();
    renderModal(4, { onClosePendingReview });
    expect(screen.getByText(/Application Under Review/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClosePendingReview).toHaveBeenCalledTimes(1);
  });
});
