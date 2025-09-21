"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { CURRENCIES } from "@/lib/localization-data";
import {
  formatCurrency as formatCurrencyValue,
  isValidCurrency,
} from "@/lib/localization-utils";
import type {
  ExpenseFormPayload,
  ExpenseParticipantFormValue,
} from "@/types/expense";
import {
  ExpenseCategory,
  ExpenseCategoryParent,
} from "@/hooks/useExpenseCategories";

type Step = "details" | "participants" | "review";

type AttachmentPreview = {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
};

type ParticipantOption = {
  id: string;
  name: string | null;
  email: string | null;
};

type CurrencyOption = {
  code: string;
  name?: string | null;
  symbol?: string | null;
};

type ExpenseFormProps = {
  expenseCategories: ExpenseCategory[];
  defaultCurrency: string;
  currentUser: {
    id: string;
    name?: string;
    email?: string;
  };
};

const STEP_ORDER: Step[] = ["details", "participants", "review"];

const STEP_LABELS: Record<Step, { title: string; description: string }> = {
  details: {
    title: "Expense details",
    description: "What was purchased, for how much, and when",
  },
  participants: {
    title: "Participants & split",
    description: "Who was involved and how you want to share it",
  },
  review: {
    title: "Review & confirm",
    description: "Double check everything before saving",
  },
};

function formatDateTimeLocal(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseAmountToCents(value: string): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/,/g, "").trim();
  if (!/^(\d+)(\.\d{0,2})?$/.test(normalized)) {
    return null;
  }

  const [whole, fractional = ""] = normalized.split(".");
  const cents =
    parseInt(whole, 10) * 100 + parseInt(fractional.padEnd(2, "0"), 10);
  return Number.isNaN(cents) ? null : cents;
}

function toIsoString(localValue: string): string {
  const date = new Date(localValue);
  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ExpenseForm({
  expenseCategories,
  defaultCurrency,
  currentUser,
}: ExpenseFormProps) {
  const router = useRouter();

  const normalizedDefaultCurrency = (() => {
    const fallback = (defaultCurrency || "USD").toUpperCase();
    return isValidCurrency(fallback) ? fallback : "USD";
  })();

  const [userLocale] = useState(() =>
    typeof navigator !== "undefined" && navigator.language
      ? navigator.language
      : "en-US"
  );

  const [step, setStep] = useState<Step>("details");
  const [categoryOptions, setCategoryOptions] =
    useState<ExpenseCategory[]>(expenseCategories);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formValues, setFormValues] = useState({
    description: "",
    amount: "",
    currency: normalizedDefaultCurrency,
    occurredAt: formatDateTimeLocal(new Date()),
    dueAt: "",
    categoryId: null as string | null,
    notes: "",
    splitMethod: "equal" as "equal" | "exact",
    participants: [
      {
        userId: currentUser.id,
        name: currentUser.name ?? currentUser.email ?? "You",
        email: currentUser.email,
        shareAmount: undefined,
      },
    ] as ExpenseParticipantFormValue[],
    paidByUserId: currentUser.id,
  });

  const defaultCurrencyRef = useRef(normalizedDefaultCurrency);

  useEffect(() => {
    setFormValues((prev) => {
      const previousDefault = defaultCurrencyRef.current;
      defaultCurrencyRef.current = normalizedDefaultCurrency;

      if (!prev.currency || prev.currency === previousDefault) {
        if (prev.currency === normalizedDefaultCurrency) {
          return prev;
        }

        return {
          ...prev,
          currency: normalizedDefaultCurrency,
        };
      }

      return prev;
    });
  }, [normalizedDefaultCurrency]);

  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [participantQuery, setParticipantQuery] = useState("");
  const [participantResults, setParticipantResults] = useState<
    ParticipantOption[]
  >([]);
  const [isSearchingParticipants, setIsSearchingParticipants] = useState(false);
  const [participantSearchError, setParticipantSearchError] = useState<
    string | null
  >(null);

  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [newCategoryForm, setNewCategoryForm] = useState({
    name: "",
    parentId: "",
    icon: "",
    color: "",
    description: "",
  });
  const [newCategoryError, setNewCategoryError] = useState<string | null>(null);

  useEffect(() => {
    setCategoryOptions(expenseCategories);
  }, [expenseCategories]);

  useEffect(() => {
    if (participantQuery.trim().length < 2) {
      setParticipantResults([]);
      setParticipantSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setIsSearchingParticipants(true);
      setParticipantSearchError(null);

      try {
        const response = await fetch(
          `/api/users/search?q=${encodeURIComponent(participantQuery.trim())}`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "Failed to search users");
        }

        const data = await response.json();
        setParticipantResults(Array.isArray(data?.results) ? data.results : []);
      } catch (error) {
        if (!controller.signal.aborted) {
          setParticipantSearchError(
            error instanceof Error ? error.message : "Failed to search users"
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearchingParticipants(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [participantQuery]);

  useEffect(() => {
    return () => {
      attachments.forEach((attachment) => {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      });
    };
  }, [attachments]);

  const categoryOptionsSorted = useMemo(() => {
    return [...categoryOptions].sort((a, b) => {
      const parentComparison = (a.parent?.name ?? "").localeCompare(
        b.parent?.name ?? ""
      );
      if (parentComparison !== 0) return parentComparison;
      return a.name.localeCompare(b.name);
    });
  }, [categoryOptions]);

  const applyFieldErrors = useCallback(
    (updates: Record<string, string | null>) => {
      setFieldErrors((prev) => {
        const next = { ...prev };
        for (const [field, message] of Object.entries(updates)) {
          if (message) {
            next[field] = message;
          } else {
            delete next[field];
          }
        }
        return next;
      });
    },
    []
  );

  const currencyOptions = useMemo<CurrencyOption[]>(() => {
    const options: CurrencyOption[] = [];
    const seen = new Set<string>();

    CURRENCIES.forEach((currency) => {
      const code = currency.code.toUpperCase();
      if (seen.has(code)) {
        return;
      }
      seen.add(code);
      options.push({
        code,
        name: currency.name,
        symbol: currency.symbol,
      });
    });

    const ensureCurrency = (code: string | null | undefined) => {
      if (!code) {
        return;
      }
      const upper = code.toUpperCase();
      if (seen.has(upper)) {
        return;
      }
      const match = CURRENCIES.find((currency) =>
        currency.code.toUpperCase() === upper
      );
      if (match) {
        options.push({
          code: upper,
          name: match.name,
          symbol: match.symbol,
        });
      } else {
        options.push({
          code: upper,
          name: upper,
        });
      }
      seen.add(upper);
    };

    ensureCurrency(formValues.currency);
    ensureCurrency(normalizedDefaultCurrency);

    return options;
  }, [formValues.currency, normalizedDefaultCurrency]);

  const formatAmount = useCallback(
    (amountInCents: number) =>
      formatCurrencyValue(
        amountInCents / 100,
        formValues.currency || normalizedDefaultCurrency,
        userLocale
      ),
    [formValues.currency, normalizedDefaultCurrency, userLocale]
  );

  const handleFieldChange = <Key extends keyof typeof formValues>(
    key: Key,
    value: (typeof formValues)[Key]
  ) => {
    setFormValues((prev) => ({
      ...prev,
      [key]:
        key === "currency" && typeof value === "string"
          ? (value as string).toUpperCase()
          : value,
    }));
  };
  const handleParticipantShareChange = (userId: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      participants: prev.participants.map((participant) =>
        participant.userId === userId
          ? { ...participant, shareAmount: value }
          : participant
      ),
    }));
  };

  const handleAddParticipant = (option: ParticipantOption) => {
    if (
      formValues.participants.some(
        (participant) => participant.userId === option.id
      )
    ) {
      return;
    }

    setFormValues((prev) => ({
      ...prev,
      participants: [
        ...prev.participants,
        {
          userId: option.id,
          name: option.name ?? option.email ?? "Unnamed",
          email: option.email ?? undefined,
        },
      ],
      paidByUserId: prev.paidByUserId || option.id,
    }));
    setParticipantQuery("");
    setParticipantResults([]);
  };

  const handleRemoveParticipant = (userId: string) => {
    setFormValues((prev) => {
      if (prev.participants.length <= 1) {
        return prev;
      }

      const filtered = prev.participants.filter(
        (participant) => participant.userId !== userId
      );
      const nextPaidBy =
        prev.paidByUserId === userId && filtered.length > 0
          ? filtered[0].userId
          : prev.paidByUserId;

      return {
        ...prev,
        participants: filtered,
        paidByUserId: nextPaidBy,
      };
    });
  };

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const previews: AttachmentPreview[] = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()
        .toString(36)
        .slice(2)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      previewUrl: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
    }));

    setAttachments((prev) => [...prev, ...previews]);
    event.target.value = "";
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((item) => item.id === id);
      if (attachment?.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const validateDetails = useCallback(() => {
    const updates: Record<string, string | null> = {
      description: null,
      amount: null,
      occurredAt: null,
      dueAt: null,
    };

    if (!formValues.description.trim()) {
      updates.description = "Please enter a description";
    }

    const amountCents = parseAmountToCents(formValues.amount);
    if (amountCents === null || amountCents <= 0) {
      updates.amount = "Enter a valid amount (up to 2 decimals)";
    }

    if (!formValues.occurredAt) {
      updates.occurredAt = "Choose when this expense happened";
    }

    if (formValues.occurredAt && formValues.dueAt) {
      const occurredDate = new Date(formValues.occurredAt);
      const dueDate = new Date(formValues.dueAt);
      if (
        !Number.isNaN(occurredDate.getTime()) &&
        !Number.isNaN(dueDate.getTime()) &&
        dueDate < occurredDate
      ) {
        updates.dueAt = "Due date must be after the expense date";
      }
    }

    applyFieldErrors(updates);
    return Object.values(updates).every((value) => value === null);
  }, [
    applyFieldErrors,
    formValues.amount,
    formValues.description,
    formValues.dueAt,
    formValues.occurredAt,
  ]);

  const validateParticipants = useCallback(() => {
    const updates: Record<string, string | null> = {
      participants: null,
      paidByUserId: null,
    };

    if (formValues.participants.length === 0) {
      updates.participants = "Add at least one participant";
    }

    if (
      !formValues.paidByUserId ||
      !formValues.participants.some(
        (participant) => participant.userId === formValues.paidByUserId
      )
    ) {
      updates.paidByUserId = "Select who paid for the expense";
    }

    const shareErrors: Record<string, string | null> = {};
    if (formValues.splitMethod === "exact") {
      const amountCents = parseAmountToCents(formValues.amount) ?? 0;
      let totalShareCents = 0;

      for (const participant of formValues.participants) {
        const key = `share-${participant.userId}`;
        shareErrors[key] = null;

        if (!participant.shareAmount || !participant.shareAmount.trim()) {
          shareErrors[key] = "Enter this person's share";
          continue;
        }

        const cents = parseAmountToCents(participant.shareAmount);
        if (cents === null || cents < 0) {
          shareErrors[key] = "Invalid amount";
          continue;
        }

        totalShareCents += cents;
      }

      if (totalShareCents !== amountCents) {
        updates.participants = "Participant shares must total the full amount";
      }
    }

    applyFieldErrors({ ...updates, ...shareErrors });
    return (
      Object.values(updates).every((value) => value === null) &&
      Object.values(shareErrors).every((value) => value === null)
    );
  }, [
    applyFieldErrors,
    formValues.amount,
    formValues.participants,
    formValues.paidByUserId,
    formValues.splitMethod,
  ]);

  const goToNextStep = () => {
    if (step === "details" && validateDetails()) {
      setStep("participants");
    } else if (step === "participants" && validateParticipants()) {
      setStep("review");
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = STEP_ORDER.indexOf(step);
    if (currentIndex > 0) {
      setStep(STEP_ORDER[currentIndex - 1]);
    }
  };

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNewCategoryError(null);

    const name = newCategoryForm.name.trim();
    if (!name) {
      setNewCategoryError("Give your category a name");
      return;
    }

    setIsSavingCategory(true);
    try {
      const response = await fetch("/api/expenses/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          parentId: newCategoryForm.parentId || null,
          icon: newCategoryForm.icon || null,
          color: newCategoryForm.color || null,
          description: newCategoryForm.description || null,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to create category");
      }

      const created = data?.category;
      if (created) {
        const parent: ExpenseCategoryParent = {
          id: created.parent?.id ?? null,
          name: created.parent?.name ?? null,
        };
        const option: ExpenseCategory = {
          id: created.id,
          name: created.name,
          parent: parent,
          icon: created.icon ?? null,
          color: created.color ?? null,
          scope: created.scope ?? null,
        };
        setCategoryOptions((prev) => [...prev, option]);
        setFormValues((prev) => ({
          ...prev,
          categoryId: option.id,
        }));
      }

      setIsCategoryDrawerOpen(false);
      setNewCategoryForm({
        name: "",
        parentId: "",
        icon: "",
        color: "",
        description: "",
      });
    } catch (error) {
      setNewCategoryError(
        error instanceof Error ? error.message : "Failed to create category"
      );
    } finally {
      setIsSavingCategory(false);
    }
  };

  const buildPayload = (): ExpenseFormPayload => {
    const normalizeAmount = (value: string) => {
      const cents = parseAmountToCents(value);
      if (cents === null) return value;
      return (cents / 100).toFixed(2);
    };

    return {
      description: formValues.description.trim(),
      notes: formValues.notes.trim() ? formValues.notes.trim() : undefined,
      amount: normalizeAmount(formValues.amount),
      currency: formValues.currency || normalizedDefaultCurrency,
      occurredAt: toIsoString(formValues.occurredAt),
      dueAt: formValues.dueAt ? toIsoString(formValues.dueAt) : null,
      splitMethod: formValues.splitMethod,
      categoryId: formValues.categoryId,
      paidByUserId: formValues.paidByUserId,
      participants: formValues.participants.map((participant) => ({
        userId: participant.userId,
        shareAmount:
          formValues.splitMethod === "exact"
            ? participant.shareAmount
            : undefined,
      })),
      attachments: attachments.map((attachment) => ({
        fileName: attachment.name,
        fileSize: attachment.size,
        contentType: attachment.type,
      })),
    };
  };

  const handleSubmit = async () => {
    const detailsOk = validateDetails();
    const participantsOk = validateParticipants();

    if (!detailsOk) {
      setStep("details");
      return;
    }

    if (!participantsOk) {
      setStep("participants");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = buildPayload();
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to create expense");
      }

      router.push("/dashboard");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to create expense"
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  const renderedStep = (() => {
    if (step === "details") {
      return (
        <div className="space-y-6">
          <div>
            <label
              className="block text-sm font-medium text-gray-700 mb-2"
              htmlFor="expense-description"
            >
              Description
            </label>
            <input
              id="expense-description"
              type="text"
              value={formValues.description}
              onChange={(event) =>
                handleFieldChange("description", event.target.value)
              }
              placeholder="Dinner at La Trattoria"
              className={`w-full px-4 py-3 border ${
                fieldErrors.description ? "border-red-400" : "border-gray-300"
              } rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors`}
            />
            {fieldErrors.description && (
              <p className="mt-2 text-sm text-red-600">
                {fieldErrors.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-2"
                htmlFor="expense-amount"
              >
                Amount
              </label>
              <div
                className={`flex rounded-lg border ${
                  fieldErrors.amount ? "border-red-400" : "border-gray-300"
                } focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500 transition-colors`}
              >
                <select
                  value={formValues.currency}
                  onChange={(event) =>
                    handleFieldChange("currency", event.target.value)
                  }
                  className="bg-transparent px-3 py-3 border-r border-gray-200 text-sm text-gray-600"
                >
                  {currencyOptions.map((currency) => {
                    const labelSegments: string[] = [];
                    if (currency.symbol) {
                      labelSegments.push(currency.symbol);
                    }
                    labelSegments.push(currency.code);
                    if (currency.name && currency.name !== currency.code) {
                      labelSegments.push(`- ${currency.name}`);
                    }
                    const label = labelSegments.join(" ").trim();

                    return (
                      <option key={currency.code} value={currency.code}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <input
                  id="expense-amount"
                  type="text"
                  inputMode="decimal"
                  value={formValues.amount}
                  onChange={(event) =>
                    handleFieldChange("amount", event.target.value)
                  }
                  placeholder="0.00"
                  className="flex-1 px-4 py-3 rounded-r-lg focus:outline-none"
                />
              </div>
              {fieldErrors.amount && (
                <p className="mt-2 text-sm text-red-600">
                  {fieldErrors.amount}
                </p>
              )}
            </div>

            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-2"
                htmlFor="expense-occurredAt"
              >
                Occurred on
              </label>
              <input
                id="expense-occurredAt"
                type="datetime-local"
                value={formValues.occurredAt}
                onChange={(event) =>
                  handleFieldChange("occurredAt", event.target.value)
                }
                className={`w-full px-4 py-3 border ${
                  fieldErrors.occurredAt ? "border-red-400" : "border-gray-300"
                } rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors`}
              />
              {fieldErrors.occurredAt && (
                <p className="mt-2 text-sm text-red-600">
                  {fieldErrors.occurredAt}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-2"
                htmlFor="expense-dueAt"
              >
                Due by <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="expense-dueAt"
                type="datetime-local"
                value={formValues.dueAt}
                onChange={(event) =>
                  handleFieldChange("dueAt", event.target.value)
                }
                className={`w-full px-4 py-3 border ${
                  fieldErrors.dueAt ? "border-red-400" : "border-gray-300"
                } rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors`}
              />
              {fieldErrors.dueAt && (
                <p className="mt-2 text-sm text-red-600">{fieldErrors.dueAt}</p>
              )}
            </div>

            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-2"
                htmlFor="expense-category"
              >
                Category <span className="text-gray-400">(optional)</span>
              </label>
              <div className="flex gap-3">
                <select
                  id="expense-category"
                  value={formValues.categoryId ?? ""}
                  onChange={(event) =>
                    handleFieldChange("categoryId", event.target.value || null)
                  }
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                >
                  <option value="">No category</option>
                  {categoryOptionsSorted.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.parent?.name
                        ? `${category.parent.name} / ${category.name}`
                        : category.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsCategoryDrawerOpen(true)}
                  className="px-4 py-3 border border-dashed border-green-400 text-green-600 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors"
                >
                  New
                </button>
              </div>
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium text-gray-700 mb-2"
              htmlFor="expense-notes"
            >
              Notes <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="expense-notes"
              rows={4}
              value={formValues.notes}
              onChange={(event) =>
                handleFieldChange("notes", event.target.value)
              }
              placeholder="Add context everyone should know..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipts <span className="text-gray-400">(optional)</span>
            </label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
              <input
                id="expense-receipts"
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleAttachmentChange}
                className="hidden"
              />
              <label
                htmlFor="expense-receipts"
                className="cursor-pointer text-green-600 font-medium"
              >
                Click to upload or drag and drop
              </label>
              <p className="mt-2 text-sm text-gray-500">
                Upload receipts or invoices (images or PDF)
              </p>

              {attachments.length > 0 && (
                <ul className="mt-4 space-y-3 text-left">
                  {attachments.map((attachment) => (
                    <li
                      key={attachment.id}
                      className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {attachment.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatBytes(attachment.size)}
                          {attachment.type ? ` - ${attachment.type}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(attachment.id)}
                        className="text-sm text-red-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (step === "participants") {
      const amountCents = parseAmountToCents(formValues.amount) ?? 0;
      const participantCount = formValues.participants.length || 1;
      const baseShare = Math.floor(amountCents / participantCount);
      const remainder = amountCents - baseShare * participantCount;

      const equalShareLookup = formValues.participants.reduce<
        Record<string, string>
      >((acc, participant, index) => {
        const cents = baseShare + (index < remainder ? 1 : 0);
        acc[participant.userId] = (cents / 100).toFixed(2);
        return acc;
      }, {});

      return (
        <div className="space-y-6">
          <div>
            <label
              className="block text-sm font-medium text-gray-700 mb-2"
              htmlFor="participant-search"
            >
              Add people
            </label>
            <input
              id="participant-search"
              type="search"
              value={participantQuery}
              onChange={(event) => setParticipantQuery(event.target.value)}
              placeholder="Search by name or email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
            />
            {participantSearchError && (
              <p className="mt-2 text-sm text-red-600">
                {participantSearchError}
              </p>
            )}
            {participantQuery.trim().length >= 2 &&
              participantResults.length > 0 && (
                <ul className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {participantResults.map((result) => (
                    <li key={result.id}>
                      <button
                        type="button"
                        onClick={() => handleAddParticipant(result)}
                        className="w-full text-left px-4 py-3 hover:bg-green-50"
                      >
                        <p className="text-sm font-medium text-gray-900">
                          {result.name ?? result.email}
                        </p>
                        {result.email && (
                          <p className="text-xs text-gray-500">
                            {result.email}
                          </p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            {isSearchingParticipants && (
              <p className="mt-2 text-sm text-gray-500">Searching...</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Split method
              </span>
              <div className="flex rounded-full bg-gray-100 p-1 text-sm">
                {(["equal", "exact"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => handleFieldChange("splitMethod", method)}
                    className={`px-3 py-1.5 rounded-full transition-colors ${
                      formValues.splitMethod === method
                        ? "bg-white shadow-sm text-green-600 font-semibold"
                        : "text-gray-600"
                    }`}
                  >
                    {method === "equal" ? "Split evenly" : "Exact amounts"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {formValues.participants.map((participant) => {
              const shareKey = `share-${participant.userId}`;
              const equalShare = equalShareLookup[participant.userId];

              return (
                <div
                  key={participant.userId}
                  className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-center"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {participant.name ?? participant.email ?? "Unnamed"}
                    </p>
                    {participant.email && (
                      <p className="text-xs text-gray-500">
                        {participant.email}
                      </p>
                    )}
                  </div>

                  <div className="md:w-40">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Share
                    </label>
                    {formValues.splitMethod === "equal" ? (
                      <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700">
                        {formatAmount(
                          parseAmountToCents(equalShare ?? "0") ?? 0
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={participant.shareAmount ?? ""}
                        onChange={(event) =>
                          handleParticipantShareChange(
                            participant.userId,
                            event.target.value
                          )
                        }
                        placeholder={equalShare}
                        className={`w-full px-3 py-2 border ${
                          fieldErrors[shareKey]
                            ? "border-red-400"
                            : "border-gray-300"
                        } rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors`}
                      />
                    )}
                    {fieldErrors[shareKey] && (
                      <p className="mt-1 text-xs text-red-600">
                        {fieldErrors[shareKey]}
                      </p>
                    )}
                  </div>

                  <div className="md:w-40">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Paid?
                    </label>
                    <select
                      value={formValues.paidByUserId}
                      onChange={(event) =>
                        handleFieldChange("paidByUserId", event.target.value)
                      }
                      className={`w-full px-3 py-2 border ${
                        fieldErrors.paidByUserId
                          ? "border-red-400"
                          : "border-gray-300"
                      } rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm transition-colors`}
                    >
                      {formValues.participants.map((option) => (
                        <option key={option.userId} value={option.userId}>
                          {option.name ?? option.email ?? "Unnamed"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:w-24 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        handleRemoveParticipant(participant.userId)
                      }
                      disabled={formValues.participants.length <= 1}
                      className="text-sm text-red-500 hover:text-red-600 disabled:text-gray-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
            {fieldErrors.participants && (
              <p className="text-sm text-red-600">{fieldErrors.participants}</p>
            )}
          </div>
        </div>
      );
    }
    const amountCents = parseAmountToCents(formValues.amount) ?? 0;
    const participantCount = formValues.participants.length || 1;
    const baseShare = Math.floor(amountCents / participantCount);
    const remainder = amountCents - baseShare * participantCount;

    const equalShareLookup = formValues.participants.reduce<
      Record<string, string>
    >((acc, participant, index) => {
      const cents = baseShare + (index < remainder ? 1 : 0);
      acc[participant.userId] = (cents / 100).toFixed(2);
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Expense summary
          </h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Description</dt>
              <dd className="font-medium text-gray-900">
                {formValues.description}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Amount</dt>
              <dd className="font-medium text-gray-900">
                {formatAmount(amountCents)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">When</dt>
              <dd className="font-medium text-gray-900">
                {new Date(formValues.occurredAt).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Category</dt>
              <dd className="font-medium text-gray-900">
                {formValues.categoryId
                  ? categoryOptions.find(
                      (category) => category.id === formValues.categoryId
                    )?.name ?? ""
                  : "No category"}
              </dd>
            </div>
            {formValues.notes && (
              <div className="md:col-span-2">
                <dt className="text-gray-500">Notes</dt>
                <dd className="font-medium text-gray-900 whitespace-pre-line">
                  {formValues.notes}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Split overview
          </h3>
          <ul className="space-y-3">
            {formValues.participants.map((participant) => {
              const share =
                formValues.splitMethod === "equal"
                  ? equalShareLookup[participant.userId]
                  : participant.shareAmount ||
                    equalShareLookup[participant.userId];
              const paidLabel =
                participant.userId === formValues.paidByUserId ? " (paid)" : "";
              return (
                <li
                  key={participant.userId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium text-gray-900">
                    {participant.name ?? participant.email ?? "Unnamed"}
                    <span className="ml-1 text-xs text-gray-500">
                      {paidLabel}
                    </span>
                  </span>
                  <span className="text-gray-700">
                    {formatAmount(parseAmountToCents(share ?? "0") ?? 0)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {attachments.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Receipts
            </h3>
            <ul className="space-y-3 text-sm">
              {attachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex items-center justify-between"
                >
                  <span className="text-gray-900">{attachment.name}</span>
                  <span className="text-gray-500">
                    {formatBytes(attachment.size)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  })();

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
      <div className="border-b border-gray-100 px-6 py-5">
        <ol className="flex flex-col gap-3 md:flex-row md:gap-6">
          {STEP_ORDER.map((stepId, index) => {
            const active = step === stepId;
            const completed = STEP_ORDER.indexOf(step) > index;
            return (
              <li key={stepId} className="flex items-center gap-3">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    active
                      ? "bg-green-600 text-white"
                      : completed
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {STEP_LABELS[stepId].title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {STEP_LABELS[stepId].description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="px-6 py-8">{renderedStep}</div>

      {submitError && (
        <div className="px-6 pb-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {submitError}
          </div>
        </div>
      )}

      <div className="px-6 py-5 border-t border-gray-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          {step !== "details" && (
            <button
              type="button"
              onClick={goToPreviousStep}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Back
            </button>
          )}
        </div>
        <div className="flex gap-3">
          {step !== "review" ? (
            <button
              type="button"
              onClick={goToNextStep}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {isSubmitting ? "Saving..." : "Save expense"}
            </button>
          )}
        </div>
      </div>

      {isCategoryDrawerOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end md:items-center md:justify-center z-50">
          <div className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                New category
              </h3>
              <button
                type="button"
                onClick={() => setIsCategoryDrawerOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleCreateCategory}>
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-2"
                  htmlFor="new-category-name"
                >
                  Name
                </label>
                <input
                  id="new-category-name"
                  type="text"
                  value={newCategoryForm.name}
                  onChange={(event) =>
                    setNewCategoryForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="e.g. Team lunch"
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-2"
                  htmlFor="new-category-parent"
                >
                  Parent <span className="text-gray-400">(optional)</span>
                </label>
                <select
                  id="new-category-parent"
                  value={newCategoryForm.parentId}
                  onChange={(event) =>
                    setNewCategoryForm((prev) => ({
                      ...prev,
                      parentId: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                >
                  <option value="">No parent</option>
                  {categoryOptionsSorted
                    .filter((category) => !category.parent?.id)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 mb-2"
                    htmlFor="new-category-icon"
                  >
                    Icon <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    id="new-category-icon"
                    type="text"
                    value={newCategoryForm.icon}
                    onChange={(event) =>
                      setNewCategoryForm((prev) => ({
                        ...prev,
                        icon: event.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    placeholder="Emoji or short label"
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 mb-2"
                    htmlFor="new-category-color"
                  >
                    Color <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    id="new-category-color"
                    type="text"
                    value={newCategoryForm.color}
                    onChange={(event) =>
                      setNewCategoryForm((prev) => ({
                        ...prev,
                        color: event.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    placeholder="#16a34a"
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-2"
                  htmlFor="new-category-description"
                >
                  Description <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  id="new-category-description"
                  rows={3}
                  value={newCategoryForm.description}
                  onChange={(event) =>
                    setNewCategoryForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="Short description"
                />
              </div>

              {newCategoryError && (
                <div className="text-sm text-red-600">{newCategoryError}</div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryDrawerOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm font-semibold"
                >
                  {isSavingCategory ? "Saving..." : "Save category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


