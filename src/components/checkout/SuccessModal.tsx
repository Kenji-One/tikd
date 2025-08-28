"use client";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SuccessModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center">
      {/* Backdrop */}
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="relative z-[121] w-[min(760px,92vw)] rounded-2xl bg-neutral-900 p-8 text-center shadow-2xl">
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute right-6 top-6 text-neutral-300 hover:text-neutral-0 cursor-pointer transtion duration-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M6 18L18 6M6 6L18 18"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-success-700">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
            <path
              d="M20 6L9 17l-5-5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-[28px] font-extrabold leading-tight text-neutral-0">
          Successful Payment!
        </h2>
        <p className="mx-auto max-w-[560px] text-neutral-200">
          Congrats! You’ve successfully bought tickets. View the ticket details
          in your dashboard, or continue exploring other events.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <a
            href="/dashboard"
            className="rounded-full bg-neutral-0 px-6 py-3 font-semibold text-neutral-950"
          >
            View Tickets
          </a>
          <a
            href="/"
            className="rounded-full border border-neutral-700 px-6 py-3 font-semibold text-neutral-0"
          >
            Explore Events
          </a>
        </div>
      </div>
    </div>
  );
}
