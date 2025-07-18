import { LucideIcon } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Props                                                                     */
/* -------------------------------------------------------------------------- */

type ButtonRow = {
  /** Row headline (e.g. organization name) */
  label: string;
  /** One or more buttons / links shown on the right */
  children: React.ReactNode;
  /* mutually exclusive */
  value?: never;
  icon?: never;
};

type InfoRow = {
  /** Label on the left (“Phone”, “Email”, “Website”…). */
  label: string;
  /** The actual value (text / link). */
  value: string;
  /** Optional Lucide icon */
  icon?: LucideIcon;
  /* mutually exclusive */
  children?: never;
};

type Props = ButtonRow | InfoRow;

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function ContactRow(props: Props) {
  /* ──────────────────────────────────────────────────────────────────────── */
  /*  ①  BUTTON-ROW VARIANT  (label + buttons)                               */
  /* ──────────────────────────────────────────────────────────────────────── */
  if ("children" in props && props.children) {
    return (
      <div className="flex items-center justify-between gap-4 py-2">
        <p className="font-medium text-neutral-0">{props.label}</p>
        {props.children}
      </div>
    );
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  ②  INFO-ROW VARIANT  (icon + label + value)                            */
  /* ──────────────────────────────────────────────────────────────────────── */
  const { label, value, icon: Icon } = props;

  return (
    <div className="flex items-start gap-4 py-1">
      {Icon && <Icon size={16} className="shrink-0 text-neutral-300" />}

      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-0">{label}</p>
        <p className="break-all text-sm text-neutral-100/80">{value}</p>
      </div>
    </div>
  );
}
