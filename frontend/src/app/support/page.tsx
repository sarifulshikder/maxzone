"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  RefreshCcw,
  MessageSquare,
  UserRound,
  Tag,
  AlertTriangle,
  X,
  Send,
  Layers,
} from "lucide-react";
import api from "@/lib/api";
import { Ticket, TicketDetail, CreateTicketPayload, ApiResponse } from "@/types";

const COLUMNS: { key: string; label: string; accent: string; ring: string }[] = [
  { key: "OPEN", label: "Open", accent: "text-sky-400", ring: "bg-sky-500" },
  { key: "IN_PROGRESS", label: "In Progress", accent: "text-amber-400", ring: "bg-amber-500" },
  { key: "RESOLVED", label: "Resolved", accent: "text-emerald-400", ring: "bg-emerald-500" },
];

const PRIORITY_STYLE: Record<string, string> = {
  URGENT: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  LOW: "bg-zinc-800 text-zinc-400 border-zinc-700",
};

const CATEGORY_STYLE: Record<string, string> = {
  BILLING: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CONNECTIVITY: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  EQUIPMENT: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  INSTALLATION: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  OTHER: "bg-zinc-800 text-zinc-400 border-zinc-700",
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selected, setSelected] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiResponse<Ticket[]>>("/tickets");
      if (res.data?.success) {
        setTickets(res.data.data ?? []);
      }
    } catch {
      setError("Failed to load tickets — check backend connectivity");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const moveTicket = async (id: string, status: string) => {
    const previous = tickets;
    setTickets(prev => (prev ?? []).map(t => (t.id === id ? { ...t, status: status as Ticket["status"] } : t)));
    try {
      const res = await api.patch<ApiResponse<Ticket>>(`/tickets/${id}/status`, { status });
      if (!res.data?.success) throw new Error("patch failed");
    } catch {
      setTickets(previous);
    }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setSelected(null);
    try {
      const res = await api.get<ApiResponse<TicketDetail>>(`/tickets/${id}`);
      if (res.data?.success) setSelected(res.data.data ?? null);
    } catch {
      /* ignore */
    } finally {
      setDetailLoading(false);
    }
  };

  const byStatus = (key: string) => (tickets ?? []).filter(t => t.status === key);
  const counts = {
    total: tickets?.length ?? 0,
    open: byStatus("OPEN").length,
    inProgress: byStatus("IN_PROGRESS").length,
    resolved: byStatus("RESOLVED").length,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400">Phase 8</span>
            <span className="text-xs text-zinc-600">NOC Ticket Board</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Support Helpdesk</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage subscriber issues with drag-and-drop Kanban workflow</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchTickets}
            disabled={loading}
            className="p-2.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-xl transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowNewTicket(true)}
            className="flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-colors shadow-lg shadow-emerald-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>New Ticket</span>
          </button>
        </div>
      </div>

      {/* Stat chips */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Total Tickets", value: counts.total, color: "text-zinc-200" },
          { label: "Open", value: counts.open, color: "text-sky-400" },
          { label: "In Progress", value: counts.inProgress, color: "text-amber-400" },
          { label: "Resolved", value: counts.resolved, color: "text-emerald-400" },
        ].map(s => (
          <div key={s.label} className="flex items-center space-x-2 bg-zinc-900/80 border border-zinc-800 rounded-full py-1.5 pl-3 pr-4">
            <span className={`text-lg font-extrabold font-mono ${s.color}`}>{s.value}</span>
            <span className="text-[11px] text-zinc-500">{s.label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-3 bg-rose-950/50 border border-rose-800 rounded-xl text-xs text-rose-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map(col => {
          const items = byStatus(col.key);
          const isDropTarget = draggingId !== null;
          return (
            <div
              key={col.key}
              onDragOver={e => { if (isDropTarget) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }}
              onDrop={e => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                if (id && items.every(t => t.id !== id)) moveTicket(id, col.key);
                setDraggingId(null);
              }}
              className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl flex flex-col min-h-[320px]"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80">
                <div className="flex items-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.ring}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${col.accent}`}>{col.label}</span>
                  <span className="text-[10px] font-mono text-zinc-600">{items.length}</span>
                </div>
              </div>

              <div className="flex-1 p-3 space-y-3">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 text-zinc-700 border-2 border-dashed border-zinc-800 rounded-xl text-[11px] font-mono">
                    <Layers className="w-4 h-4 mb-1 opacity-40" />
                    Drop tickets here
                  </div>
                ) : (
                  items.map(t => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={e => { setDraggingId(t.id); e.dataTransfer.setData("text/plain", t.id); e.dataTransfer.effectAllowed = "move"; }}
                      onDragEnd={() => setDraggingId(null)}
                      onClick={() => openDetail(t.id)}
                      className={`group cursor-pointer bg-zinc-950/70 border border-zinc-800 hover:border-zinc-600 rounded-xl p-3 space-y-2 transition-colors ${draggingId === t.id ? "opacity-40" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-500">{t.ticket_no}</span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.MEDIUM}`}>
                          {t.priority}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-zinc-100 leading-snug">{t.subject}</p>
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className={`inline-flex items-center space-x-1 text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${CATEGORY_STYLE[t.category] || CATEGORY_STYLE.OTHER}`}>
                            <Tag className="w-2.5 h-2.5" />
                            <span>{t.category}</span>
                          </span>
                          {t.customer_username && (
                            <span className="inline-flex items-center space-x-1 text-[9px] font-mono text-zinc-500 truncate">
                              <UserRound className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate max-w-[60px]">{t.customer_username}</span>
                            </span>
                          )}
                        </div>
                        <span className="inline-flex items-center space-x-1 text-[9px] font-mono text-zinc-600">
                          <MessageSquare className="w-2.5 h-2.5" />
                          <span>{t.reply_count}</span>
                        </span>
                      </div>
                      {t.priority === "URGENT" && (
                        <div className="flex items-center space-x-1.5 text-[9px] text-rose-400 pt-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Escalated — attention required</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New ticket modal */}
      {showNewTicket && <NewTicketModal onClose={() => setShowNewTicket(false)} onCreate={() => { setShowNewTicket(false); fetchTickets(); }} />}

      {/* Ticket detail drawer */}
      {selected && (
        <TicketDetailDrawer
          detail={selected}
          loading={detailLoading}
          onClose={() => setSelected(null)}
          onUpdated={d => { setSelected(d); fetchTickets(); }}
        />
      )}
    </div>
  );
}

/* ============================================================ */
/* New Ticket Modal                                             */
/* ============================================================ */
function NewTicketModal({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
  const [form, setForm] = useState<CreateTicketPayload>({ subject: "", category: "BILLING", priority: "MEDIUM", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim()) { setFormError("Subject is required"); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await api.post<ApiResponse<Ticket>>("/tickets", form);
      if (res.data?.success) { onCreate(); return; }
      setFormError(res.data?.error?.message || "Failed to create ticket");
    } catch {
      setFormError("Network error while creating ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Plus className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-sm font-bold text-zinc-100">Open New Ticket</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {formError && (
          <p className="flex items-center space-x-2 p-2.5 bg-rose-950/50 border border-rose-800 rounded-xl text-[11px] text-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{formError}</span>
          </p>
        )}

        <form onSubmit={submit} className="space-y-3">
          <input
            type="text"
            value={form.subject}
            onChange={e => setForm({ ...form, subject: e.target.value })}
            placeholder="Subject — e.g. No internet since last night"
            className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {["BILLING", "CONNECTIVITY", "EQUIPMENT", "INSTALLATION", "OTHER"].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
              className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Describe the issue..."
            rows={3}
            className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 text-xs font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {submitting && <RefreshCcw className="w-3.5 h-3.5 animate-spin" />}
            <span>{submitting ? "Creating..." : "Create Ticket"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

/* ============================================================ */
/* Ticket Detail Drawer                                         */
/* ============================================================ */
function TicketDetailDrawer({ detail, loading, onClose, onUpdated }: {
  detail: TicketDetail;
  loading: boolean;
  onClose: () => void;
  onUpdated: (d: TicketDetail) => void;
}) {
  const [message, setMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const { ticket, replies } = detail;

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await api.post<ApiResponse<TicketDetail>>(`/tickets/${ticket.id}/replies`, {
        message: message.trim(),
        is_internal: isInternal,
      });
      if (res.data?.success && res.data.data) {
        setMessage("");
        setIsInternal(false);
        onUpdated(res.data.data);
      }
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-zinc-950/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-zinc-900 border-l border-zinc-800 flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-[10px] font-mono text-zinc-500">{ticket.ticket_no}</span>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${PRIORITY_STYLE[ticket.priority] || PRIORITY_STYLE.MEDIUM}`}>{ticket.priority}</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${CATEGORY_STYLE[ticket.category] || CATEGORY_STYLE.OTHER}`}>{ticket.category}</span>
            </div>
            <h3 className="text-sm font-bold text-zinc-100 leading-snug">{ticket.subject}</h3>
            {ticket.customer_username && (
              <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">👤 {ticket.customer_username}{ticket.customer_name ? ` (${ticket.customer_name})` : ""}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-3">
            <p className="text-[10px] font-mono text-zinc-500 mb-1">Logged by {ticket.created_by_name || "agent"}</p>
            <p className="text-xs text-zinc-300 leading-relaxed">{ticket.description || "No description provided."}</p>
          </div>

          {loading && (
            <div className="flex justify-center py-4">
              <RefreshCcw className="w-4 h-4 text-emerald-400 animate-spin" />
            </div>
          )}

          {replies.length === 0 && !loading ? (
            <p className="text-[11px] text-zinc-600 text-center py-4 font-mono">No replies yet</p>
          ) : (
            replies.map(r => (
              <div key={r.id} className={`rounded-xl p-3 border ${r.is_internal ? "bg-amber-950/30 border-amber-800/40" : "bg-zinc-950/50 border-zinc-800"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-zinc-500">{r.author_name || r.author_id}</span>
                  <span className="flex items-center space-x-1.5">
                    {r.is_internal && (
                      <span className="text-[8px] font-mono uppercase px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Internal</span>
                    )}
                    <span className="text-[9px] font-mono text-zinc-600">{new Date(r.created_at).toLocaleString()}</span>
                  </span>
                </div>
                <p className="text-xs text-zinc-200 leading-relaxed">{r.message}</p>
              </div>
            ))
          )}
        </div>

        {/* Reply composer */}
        <form onSubmit={sendReply} className="px-5 py-4 border-t border-zinc-800 space-y-2.5">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={isInternal ? "Internal NOC note (hidden from customer)..." : "Reply to ticket..."}
            rows={2}
            className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={e => setIsInternal(e.target.checked)}
                className="w-3.5 h-3.5 accent-amber-500"
              />
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide">Internal note</span>
            </label>
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-colors disabled:opacity-40"
            >
              {sending ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}