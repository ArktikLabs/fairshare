# Design system

One visual language for the whole app. The source of truth is the code in
`src/components/ui/` and the tokens in `src/app/globals.css`; this page
explains how to use them.

## Tokens

- **Primary colour:** indigo, exposed as `brand-50` … `brand-900`
  (`bg-brand-600` for primary buttons, `text-brand-700` for links).
- **Neutrals:** Tailwind `slate`. The page background is `slate-50`, cards are white with
  a `slate-200` border.
- **Money semantics, used only for money:** positive (you are owed / you lent) is `emerald-700`,
  negative (you owe / you borrowed) is `rose-600`, zero is `slate-500`.
- **Numbers** use the `.tabular` class (tabular figures) so columns line up.
- **Radius:** `rounded-lg` for controls, `rounded-xl` for cards.
- **Icons:** `lucide-react` at `size-4` inline and `size-5` in navigation. No emoji icons.

## Components (`src/components/ui/`)

| File | Exports | Notes |
| --- | --- | --- |
| `button.tsx` | `Button`, `ButtonLink` | Variants `primary`, `secondary`, `ghost`, `danger`, `link`. Sizes `sm`, `md`, `lg`, `icon`. |
| `input.tsx` | `Input`, `Select`, `Textarea`, `Field` | `Field` renders the label, hint and inline error. Set `aria-invalid` on the control when there is an error. |
| `primitives.tsx` | `Card`, `CardHeader`, `Badge`, `Alert`, `EmptyState`, `Skeleton`, `Avatar`, `Money`, `PageHeader` | `Money` is the only way to print an amount: `signed` adds +/− and colour, and `absolute` drops the sign when the words already say who owes. |
| `category-icon.tsx` | `CategoryIcon` | Icons come from the shared list in `src/lib/categories.ts`. |
| `currency-select.tsx` | `CurrencySelect` | A searchable ISO 4217 list (`src/lib/currencies.ts`). |
| `action-menu.tsx` | `ActionMenu` | A Radix dropdown behind a `⋯` button, for row actions on mobile. |
| `dialog.tsx` | `ConfirmDialog` | Use it in place of `window.confirm()`. |

Money-specific helpers live in `src/components/money-bits.tsx`:

- `BalanceLabel` renders "you owe" / "you are owed" / "settled up".
- `ExpenseShare` renders "you lent" / "you borrowed" / "your share".

## Shared data

- `src/lib/categories.ts` holds the expense categories: enum value, label and icon. Never show the
  raw enum value.
- `src/lib/currencies.ts` holds the currency list, popular codes first, generated from ICU data.
  `resolveCurrency()` falls back to USD.
- `src/lib/utils.ts#formatCurrency` is the only money formatter.

## Layout

- Authenticated pages live in the `src/app/(app)/` route group. Their shared layout
  (`src/components/app-shell.tsx`) puts a top nav on desktop and a bottom tab bar on mobile:
  Home, Groups, Add expense (primary), Settle up, Account.
- Content width is `max-w-5xl` with `px-4 sm:px-6`. Pages start with `PageHeader`.
  Sub-pages show a back link (`ChevronLeft` + parent name).
- Public pages (landing, privacy, terms) use `src/components/site/site-chrome.tsx`.
  Auth pages use `src/components/site/auth-card.tsx`.
- Every page must render without horizontal overflow at 390px. Row actions go into an
  `ActionMenu`, and long text truncates or clamps rather than widening the row.

## Forms

- Validation runs on the client before submit, and errors appear inline under the field via
  `Field error`. Never use `alert()`.
- Submit buttons stay disabled until the form is valid, and the reason shows next to the button.
- Amounts are sent to the API rounded to cents.
