import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

import { useTranslation } from "../../i18n/useTranslation";
import NewAthleteStepOneForm from "../NewAthleteStepOneForm";
import NewAthleteStepTwoForm from "../NewAthleteStepTwoForm";
import type { Athlete } from "../../types/athlete";

interface AthleteModalsProps {
  isNewAthleteOpen: boolean;
  setIsNewAthleteOpen: (value: boolean) => void;
  isAthleteDetailsOpen: boolean;
  setIsAthleteDetailsOpen: (value: boolean) => void;
  registeredAthlete: Athlete | null;
  setRegisteredAthlete: (athlete: Athlete | null) => void;
  onRegistrationSuccess: (athlete: Athlete) => void;
}

const AthleteModals = ({
  isNewAthleteOpen,
  setIsNewAthleteOpen,
  isAthleteDetailsOpen,
  setIsAthleteDetailsOpen,
  registeredAthlete,
  setRegisteredAthlete,
  onRegistrationSuccess,
}: AthleteModalsProps) => {
  const t = useTranslation();

  return (
    <>
      <Transition appear show={isNewAthleteOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40" onClose={setIsNewAthleteOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-in duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-out duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
              <Transition.Child
                as={Fragment}
                enter="ease-in duration-200"
                enterFrom="opacity-0 translate-y-4 scale-95"
                enterTo="opacity-100 translate-y-0 scale-100"
                leave="ease-out duration-150"
                leaveFrom="opacity-100 translate-y-0 scale-100"
                leaveTo="opacity-0 translate-y-4 scale-95"
              >
                <Dialog.Panel className="w-full max-w-8xl sm:max-w-[92vw] transform overflow-hidden rounded-3xl bg-container-gradient shadow-2xl transition-all">
                  <Dialog.Title className="sr-only">{t.newAthlete.title}</Dialog.Title>
                  <div className="relative h-[95vh] overflow-y-invisible p-1 sm:p-6">
                    <button
                      type="button"
                      onClick={() => setIsNewAthleteOpen(false)}
                      className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/70 text-muted shadow-sm transition hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
                      aria-label={t.common.cancel}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="h-4 w-4"
                      >
                        <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                      </svg>
                    </button>
                    <NewAthleteStepOneForm
                      onSuccess={onRegistrationSuccess}
                      onClose={() => setIsNewAthleteOpen(false)}
                    />
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <Transition appear show={isAthleteDetailsOpen} as={Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-50 overflow-y-auto"
          onClose={() => {
            setIsAthleteDetailsOpen(false);
            setRegisteredAthlete(null);
          }}
        >
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
              <Transition.Child
                as={Fragment}
                enter="ease-in duration-200"
                enterFrom="opacity-0 translate-y-4 scale-95"
                enterTo="opacity-100 translate-y-0 scale-100"
                leave="ease-out duration-150"
                leaveFrom="opacity-100 translate-y-0 scale-100"
                leaveTo="opacity-0 translate-y-4 scale-95"
              >
                <Dialog.Panel className="w-full max-w-8xl sm:max-w-[92vw] transform overflow-hidden rounded-3xl bg-container-gradient shadow-2xl transition-all">
                  <Dialog.Title className="sr-only">{t.newAthlete.stepTwoTitle}</Dialog.Title>

                  <div className="relative h-[95vh] overflow-y-auto p-1 sm:p-6">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAthleteDetailsOpen(false);
                        setRegisteredAthlete(null);
                      }}
                      className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/70 text-muted shadow-sm transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
                      aria-label={t.common.cancel}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="h-4 w-4"
                      >
                        <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                      </svg>
                    </button>

                    {registeredAthlete ? (
                      <NewAthleteStepTwoForm
                        athlete={registeredAthlete}
                        onSuccess={() => {
                          setIsAthleteDetailsOpen(false);
                          setRegisteredAthlete(null);
                        }}
                        onClose={() => {
                          setIsAthleteDetailsOpen(false);
                          setRegisteredAthlete(null);
                        }}
                      />
                    ) : (
                      <div className="p-4">
                        <p>{t.athletes.empty}</p>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default AthleteModals;
