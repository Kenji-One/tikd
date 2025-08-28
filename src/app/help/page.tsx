/* --------------------------------------------------------------------------
   Tikd. – Help Center page (+ FAQ)
   -------------------------------------------------------------------------- */

"use client";

import { useState, FormEvent } from "react";
import Image from "next/image";
import clsx from "classnames";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Container } from "@/components/layout/Container";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

type ContactItemProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

function ContactItem({ icon, label, value }: ContactItemProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-948">
        {icon}
      </div>
      <div>
        <p className="font-light text-primary-952 leading-[90%] mb-2">
          {label}
        </p>
        <p className="text-[20px] font-bold leading-[90%] text-neutral-0 tracking-[-0.4px] max-w-[157px]">
          {value}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  FAQ data                                                                  */
/* -------------------------------------------------------------------------- */

type FAQ = { q: string; a: string };
type FAQCat = { id: string; title: string; faqs: FAQ[] };

const FAQ_CATEGORIES: FAQCat[] = [
  {
    id: "intro",
    title: "Introduction",
    faqs: [
      {
        q: "Introduction",
        a: "Lido is the name of a family of open-source peer-to-system software tools deployed and functioning on the Ethereum blockchain network. The software enables users to mint transferable utility tokens, which receive rewards linked to the related validation activities of writing data to the blockchain, while the tokens can be used in other on-chain activities.",
      },
      {
        q: "How does Tikd work?",
        a: "We connect organisers with attendees, providing secure payments via Stripe, real-time analytics, and QR-code entry scanning.",
      },
      {
        q: "Why TIKD?",
        a: "Because life’s better when the queue is shorter. Tikd removes friction for guests and overhead for organisers.",
      },
    ],
  },
  {
    id: "selling",
    title: "Selling Tickets",
    faqs: [
      {
        q: "How do I create an event?",
        a: "Head to your dashboard → ‘Create event’, fill out details, upload images, set pricing tiers, and publish.",
      },
      {
        q: "When do I get paid?",
        a: "Payouts are processed automatically through Stripe. You can choose instant, daily, weekly or custom schedules.",
      },
    ],
  },
  {
    id: "org",
    title: "Organization",
    faqs: [
      {
        q: "Can my team collaborate?",
        a: "Yes! Add unlimited collaborators with role-based permissions (viewer, editor, admin).",
      },
    ],
  },
  {
    id: "rules",
    title: "Site Rules",
    faqs: [
      {
        q: "What events are prohibited?",
        a: "Anything illegal, hateful, or that violates local regulations. See our full terms for details.",
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  FAQ components                                                            */
/* -------------------------------------------------------------------------- */

function FAQSection() {
  const [activeCat, setActiveCat] = useState<string>(FAQ_CATEGORIES[0].id);
  const [openQ, setOpenQ] = useState<number | null>(null);

  const current = FAQ_CATEGORIES.find((c) => c.id === activeCat)!;

  return (
    <section className="mt-14 mb-7 lg:mt-20 w-full max-w-[1232px] mx-auto px-4">
      <h2 className="mb-13 text-center text-2xl italic font-extrabold leading-[90%] tracking-[-0.64px] uppercase lg:text-[32px]">
        F.A.Q.
      </h2>

      <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
        {/* Left NAV --------------------------------------------------- */}
        <aside className="lg:w-80 lg:shrink-0 max-w-[288px]">
          <Input
            variant="transparent"
            shape="pill"
            size="md"
            placeholder="Search"
            className="text-base placeholder:text-base"
            iconClassName="!left-4"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M15.553 15.553C16.2086 14.8973 16.7287 14.119 17.0835 13.2624C17.4384 12.4058 17.621 11.4877 17.621 10.5605C17.621 9.63327 17.4384 8.71515 17.0835 7.85854C16.7287 7.00192 16.2086 6.22359 15.553 5.56796C14.8974 4.91234 14.1191 4.39227 13.2624 4.03745C12.4058 3.68262 11.4877 3.5 10.5605 3.5C9.63333 3.5 8.71522 3.68262 7.8586 4.03745C7.00199 4.39227 6.22365 4.91234 5.56802 5.56796C4.24393 6.89205 3.50006 8.68791 3.50006 10.5605C3.50006 12.433 4.24393 14.2289 5.56802 15.553C6.89212 16.8771 8.68797 17.6209 10.5605 17.6209C12.4331 17.6209 14.2289 16.8771 15.553 15.553ZM15.553 15.553L20 20"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />

          <nav className="flex flex-row gap-6 overflow-x-auto lg:flex-col mt-8">
            {FAQ_CATEGORIES.map(({ id, title }) => {
              const active = id === activeCat;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setActiveCat(id);
                    setOpenQ(null); // reset open accordions
                  }}
                  className={`whitespace-nowrap text-left text-2xl tracking-[-0.48px] transition-colors ${
                    active
                      ? "text-white"
                      : "text-white/60 hover:text-white/80 cursor-pointer"
                  }`}
                >
                  {title}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right CONTENT --------------------------------------------- */}
        <div className="flex-1 max-w-[795px]">
          {/* <h3 className="mb-8 text-2xl font-semibold text-white">
            {current.title}
          </h3> */}

          <ul>
            {current.faqs.map(({ q, a }, idx) => {
              const open = openQ === idx;
              return (
                <li key={q} className="border-b border-white/10 ">
                  <button
                    onClick={() => setOpenQ(open ? null : idx /* toggle */)}
                    className={clsx(
                      "flex w-full items-start justify-between gap-4 py-6 text-left text-2xl tracking-[-0.48px] text-white",
                      open ? "pb-4" : "",
                      idx == 0 ? "pt-0" : ""
                    )}
                  >
                    {q}
                    <span
                      className={`mt-1 shrink-0 transition-transform ${
                        open ? "rotate-180" : ""
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M16.59 8.59L12 13.17L7.41 8.59L6 10L12 16L18 10L16.59 8.59Z"
                          fill="#F8F8F5"
                        />
                      </svg>
                    </span>
                  </button>

                  {open && (
                    <p className="pb-6 text-base font-light leading-[120%] text-[rgba(248,248,245,0.6)]">
                      {a}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page Component                                                            */
/* -------------------------------------------------------------------------- */

export default function HelpPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.info("Contact form submitted:", form);
  };

  return (
    <PageWrapper className="relative ">
      <Container className="z-10">
        <div className="absolute left-1/2 top-[-36.5%] -translate-x-1/2 z-[-1] w-[1264px] h-[1264px] ">
          <Image
            src="/assets/boxes.png"
            alt=""
            fill
            sizes="1264px"
            quality={100}
            priority
            className="object-contain select-none"
          />
        </div>

        <h1 className="mb-18 text-center text-2xl font-black uppercase text-neutral-0 md:text-[40px] leading-[90%] tracking-[-0.8px] italic">
          HELP CENTER
        </h1>

        {/* CONTACT + FORM -------------------------------------------- */}
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between lg:gap-20">
          <section className="flex shrink-0 flex-col gap-4 lg:w-full lg:max-w-[237px]">
            <ContactItem
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                >
                  <path
                    d="M18 16V14.3541C18 13.5363 17.5021 12.8008 16.7428 12.4971L14.7086 11.6835C13.7429 11.2971 12.6422 11.7156 12.177 12.646L12 13C12 13 9.5 12.5 7.5 10.5C5.5 8.5 5 6 5 6L5.35402 5.82299C6.28438 5.35781 6.70285 4.25714 6.31654 3.29136L5.50289 1.25722C5.19916 0.497903 4.46374 0 3.64593 0H2C0.895431 0 0 0.89543 0 2C0 10.8366 7.16344 18 16 18C17.1046 18 18 17.1046 18 16Z"
                    fill="white"
                  />
                </svg>
              }
              label="Phone Number"
              value="(+21) 238 1729 042"
            />
            <ContactItem
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <g clipPath="url(#clip0_323_3017)">
                    <path
                      d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM19.6 8.25L12.53 12.67C12.21 12.87 11.79 12.87 11.47 12.67L4.4 8.25C4.15 8.09 4 7.82 4 7.53C4 6.86 4.73 6.46 5.3 6.81L12 11L18.7 6.81C19.27 6.46 20 6.86 20 7.53C20 7.82 19.85 8.09 19.6 8.25Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_323_3017">
                      <rect width="24" height="24" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              }
              label="Email Address"
              value="admin@tikd.vip"
            />
            {/* <ContactItem
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="20"
                  viewBox="0 0 18 20"
                  fill="none"
                >
                  <path
                    d="M9 0C13.9705 0 17.9999 3.97957 18 8.88867C18 13.7979 12.375 20 9 20C5.625 20 0 13.7979 0 8.88867C0.000118979 3.97957 4.02951 0 9 0ZM9 6C7.34315 6 6 7.34315 6 9C6 10.6569 7.34315 12 9 12C10.6569 12 12 10.6569 12 9C12 7.34315 10.6569 6 9 6Z"
                    fill="white"
                  />
                </svg>
              }
              label="Location"
              value="Time Square Building, NY, USA"
            /> */}
          </section>

          <form
            onSubmit={handleSubmit}
            className="rounded-lg bg-white/3 p-6 md:p-8 lg:flex-1 w-full lg:max-w-[592px]"
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="flex flex-col">
                <label
                  htmlFor="firstName"
                  className="mb-2 leading-[90%] text-white"
                >
                  Your name
                </label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="Enter your name here.."
                  variant="transparent"
                  value={form.firstName}
                  onChange={handleChange}
                />
              </div>

              <div className="flex flex-col">
                <label
                  htmlFor="lastName"
                  className="mb-2 leading-[90%] text-white"
                >
                  Your Last Name
                </label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Enter your last name here.."
                  variant="transparent"
                  value={form.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col">
              <label htmlFor="email" className="mb-2 leading-[90%] text-white">
                Your Email Address
              </label>
              <Input
                id="email"
                name="email"
                placeholder="Enter your email address.."
                variant="transparent"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div className="mt-4 flex flex-col">
              <label
                htmlFor="message"
                className="mb-2 leading-[90%] text-white"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                placeholder="Enter your message.."
                rows={6}
                value={form.message}
                onChange={handleChange}
                className="w-full resize-none rounded-lg border border-[#FFFFFF1A] bg-transparent px-4 py-3 text-sm text-neutral-0 placeholder:font-medium placeholder:text-[14px] placeholder:leading-none placeholder:tracking-[-0.28px] placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-0"
              />
            </div>

            <div className="mt-4 flex justify-center lg:justify-end">
              <Button type="submit">Message now</Button>
            </div>
          </form>
        </div>
      </Container>
      {/* FAQ -------------------------------------------------------- */}
      <FAQSection />
    </PageWrapper>
  );
}
