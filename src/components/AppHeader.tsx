import Link from "next/link";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/groups", label: "Groups" },
  { href: "/expenses", label: "Expenses" },
  { href: "/settlements", label: "Settle up" },
  { href: "/account", label: "Account" },
];

export default function AppHeader({ active }: { active?: string }) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="text-2xl font-bold text-gray-900">
          Fair<span className="text-green-600">Share</span>
        </Link>
        <nav className="flex gap-1 overflow-x-auto text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`px-3 py-2 rounded-md whitespace-nowrap ${
                active === n.href ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
