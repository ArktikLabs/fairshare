"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Avatar, Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/dialog";

export interface CommentView {
  id: string;
  body: string;
  when: string;
  author: { id: string; name: string };
}

export function CommentsCard({
  expenseId,
  comments,
  currentUserId,
  canComment,
}: {
  expenseId: string;
  comments: CommentView[];
  currentUserId: string;
  canComment: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/expenses/${expenseId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Could not post the comment");
      return;
    }
    setText("");
    router.refresh();
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    const res = await fetch(`/api/expenses/${expenseId}/comments/${deleting}`, { method: "DELETE" });
    setBusy(false);
    setDeleting(null);
    if (!res.ok) setError((await res.json().catch(() => ({}))).error || "Could not delete the comment");
    else router.refresh();
  };

  return (
    <Card id="comments" className="scroll-mt-20">
      <CardHeader title="Comments" description={comments.length ? `${comments.length} ${comments.length === 1 ? "comment" : "comments"}` : undefined} />
      {comments.length === 0 ? (
        <EmptyState icon={<MessageSquare />} title="No comments yet" description="Ask a question or leave a note for the group." className="py-6" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3 px-4 py-3 sm:px-5">
              <Avatar name={c.author.name} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium text-slate-900">{c.author.id === currentUserId ? "You" : c.author.name}</span>{" "}
                  <span className="text-xs text-slate-500">{c.when}</span>
                </p>
                <p className="mt-0.5 whitespace-pre-line break-words text-sm text-slate-700">{c.body}</p>
              </div>
              {c.author.id === currentUserId && (
                <Button size="icon" variant="ghost" aria-label="Delete comment" onClick={() => setDeleting(c.id)}>
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canComment && (
        <form onSubmit={post} className="flex items-end gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
          <label htmlFor="new-comment" className="sr-only">
            Add a comment
          </label>
          <Textarea
            id="new-comment"
            rows={1}
            maxLength={2000}
            placeholder="Add a comment"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-10 flex-1"
          />
          <Button type="submit" disabled={busy || !text.trim()} aria-label="Post comment">
            <Send /> <span className="hidden sm:inline">Post</span>
          </Button>
        </form>
      )}
      {error && <p className="px-4 pb-3 text-xs text-rose-600 sm:px-5" role="alert">{error}</p>}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete your comment?"
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={remove}
      />
    </Card>
  );
}
