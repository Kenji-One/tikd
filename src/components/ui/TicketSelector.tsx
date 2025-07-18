interface Props {
  label: string;
  price: number;
  qty: number;
  onChange: (n: number) => void;
}

export default function TicketSelector({ label, price, qty, onChange }: Props) {
  return (
    <div className="flex items-center justify-between">
      {/* Label & Price */}
      <div className="flex flex-col gap-[6px] leading-[100%]">
        <h4 className="text-base font-bold leading-[90%] tracking-[-0.32px] text-neutral-950">
          {label}
        </h4>
        <p className="text-base italic font-extrabold tracking-[-0.32px] text-primary-951">
          ${price.toFixed(2)}
        </p>
        <p className="text-xs tracking-[-0.24px] text-[#08080F99]">
          (Includes fees)
        </p>
      </div>

      {/* Qty Button */}
      {qty > 0 ? (
        <div className="flex items-center justify-center gap-[10px] rounded-full bg-neutral-950 p-2 text-white">
          <button
            className="text-white transition hover:opacity-80 cursor-pointer"
            onClick={() => onChange(Math.max(0, qty - 1))}
            aria-label="Decrease"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M3.33337 8.66665H8.66671H12.6667V7.33331H8.66671H3.33337V8.66665Z"
                fill="white"
              />
            </svg>
          </button>
          <span>{qty}</span>
          <button
            className="text-white transition hover:opacity-80 cursor-pointer"
            onClick={() => onChange(qty + 1)}
            aria-label="Increase"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M7.33337 8.66665H3.33337V7.33331H7.33337V3.33331H8.66671V7.33331H12.6667V8.66665H8.66671V12.6666H7.33337V8.66665Z"
                fill="white"
              />
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={() => onChange(1)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-950 text-white transition hover:opacity-90"
          aria-label="Add Ticket"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M7.33337 8.66665H3.33337V7.33331H7.33337V3.33331H8.66671V7.33331H12.6667V8.66665H8.66671V12.6666H7.33337V8.66665Z"
              fill="white"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
