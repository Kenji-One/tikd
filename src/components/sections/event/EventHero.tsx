import Image from "next/image";
import { Calendar, MapPin } from "lucide-react";
import TicketSelector from "@/components/ui/TicketSelector";
import Pill from "@/components/ui/Pill";
import { CATEGORY_COLOURS } from "@/lib/constants";

interface TicketOpt {
  label: string;
  price: number;
  qty: number;
}

interface Props {
  poster: string;
  title: string;
  category: string;
  venue: string;
  dateLabel: string;
  ticketOptions: TicketOpt[];
}

export function EventHero({
  poster,
  title,
  category,
  venue,
  dateLabel,
  ticketOptions,
}: Props) {
  return (
    <section className="relative w-full overflow-hidden">
      {/* Background Layer */}

      {/* blurred background image ------------------------------------ */}
      <div
        className="absolute inset-0 z-0 blur-[24px]"
        style={{
          backgroundImage: `url(${poster})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* dark veil --------------------------------------------------- */}
      <div className="absolute inset-0 z-0  bg-[#08080F]/60" />
      {/* Content */}
      <div className="relative mx-auto w-full max-w-[848px] px-4 pt-[72px] pb-[82px] sm:py-[120px] lg:flex lg:items-center lg:gap-[70px] lg:py-[186px]">
        {/* Poster Image */}
        <div
          className="relative shrink-0 overflow-hidden rounded-xl
             w-[220px] h-[275px] aspect-[4/5]
             sm:w-[260px] sm:h-[325px]
             md:w-[300px] md:h-[375px]
             lg:w-[342px] lg:h-[428px]"
        >
          <Image
            fill
            src={poster}
            alt={title}
            sizes="(max-width: 640px) 220px,
           (max-width: 768px) 260px,
           (max-width: 1024px) 300px,
           342px"
            className="object-cover rounded-xl"
          />
        </div>

        {/* Title + Info + Ticket Box */}
        <div className="mt-4 flex w-full flex-col text-center lg:mt-0 lg:text-left">
          <h1 className="text-3xl sm:text-4xl lg:text-[52px] font-black leading-[90%] uppercase tracking-[-1.04px] italic text-white max-w-[436px]">
            {title}
          </h1>

          <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
            <Pill
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M7.99967 7.66658C7.55765 7.66658 7.13372 7.49099 6.82116 7.17843C6.5086 6.86587 6.33301 6.44195 6.33301 5.99992C6.33301 5.55789 6.5086 5.13397 6.82116 4.82141C7.13372 4.50885 7.55765 4.33325 7.99967 4.33325C8.4417 4.33325 8.86562 4.50885 9.17819 4.82141C9.49075 5.13397 9.66634 5.55789 9.66634 5.99992C9.66634 6.21879 9.62323 6.43551 9.53947 6.63772C9.45572 6.83993 9.33295 7.02367 9.17819 7.17843C9.02342 7.33319 8.83969 7.45596 8.63748 7.53972C8.43527 7.62348 8.21854 7.66658 7.99967 7.66658ZM7.99967 1.33325C6.762 1.33325 5.57501 1.82492 4.69984 2.70009C3.82467 3.57526 3.33301 4.76224 3.33301 5.99992C3.33301 9.49992 7.99967 14.6666 7.99967 14.6666C7.99967 14.6666 12.6663 9.49992 12.6663 5.99992C12.6663 4.76224 12.1747 3.57526 11.2995 2.70009C10.4243 1.82492 9.23735 1.33325 7.99967 1.33325Z"
                    fill="white"
                  />
                </svg>
              }
              text={venue}
            />
            <Pill
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    stroke="currentColor"
                    d="M12.6667 4H3.33333C2.59695 4 2 4.59695 2 5.33333V12.6667C2 13.403 2.59695 14 3.33333 14H12.6667C13.403 14 14 13.403 14 12.6667V5.33333C14 4.59695 13.403 4 12.6667 4Z"
                    strokeWidth="2"
                  />
                  <path
                    stroke="currentColor"
                    d="M2 6.66667C2 5.40933 2 4.78133 2.39067 4.39067C2.78133 4 3.40933 4 4.66667 4H11.3333C12.5907 4 13.2187 4 13.6093 4.39067C14 4.78133 14 5.40933 14 6.66667H2Z"
                  />
                  <path
                    stroke="currentColor"
                    d="M4.667 2V4M11.333 2V4"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              }
              text={dateLabel}
              color={CATEGORY_COLOURS[category || "music"]}
            />
          </div>
          <div className="mt-6 rounded-2xl bg-white max-w-[436px]">
            {ticketOptions.map((ticket, i) => (
              <div
                key={ticket.label}
                className={
                  i !== 0
                    ? "border-t border-[#08080F1A] p-6 pb-[28px]"
                    : "p-6 pb-[28px]"
                }
              >
                <TicketSelector
                  label={ticket.label}
                  price={ticket.price}
                  qty={ticket.qty}
                  onChange={() => {}}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
