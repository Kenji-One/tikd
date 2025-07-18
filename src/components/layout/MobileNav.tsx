import Link from "next/link";
export function MobileNav({ onClose }: { onClose(): void }) {
  return (
    <nav className="p-6">
      <ul className="flex flex-col gap-4 text-brand-700">
        <li>
          <Link href="/" onClick={onClose}>
            Home
          </Link>
        </li>
        <li>
          <Link href="/help" onClick={onClose}>
            Help
          </Link>
        </li>
        <li>
          <Link href="/login" onClick={onClose}>
            Login
          </Link>
        </li>
      </ul>
    </nav>
  );
}
