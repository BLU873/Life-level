import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { TacticalPanel, HUDLabel, TacticalButton } from '../tactical';

/**
 * RoomChatPanel — tactical room chat (Phase 19C).
 *
 * Structural idea adapted from the supplied ChatBubble concept
 * (avatar + sender/message content + optional actions) rebuilt with
 * LIFE//LEVEL components — no shadcn, no new dependencies.
 *
 * Delivery reuses the room poll: `messages` arrive inside the room payload,
 * so there is no second poll loop. Own messages align right, others left.
 * Bodies render as plain text only (React escaping; server-validated).
 */
function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function Avatar({ name, own }) {
  const letter = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      aria-hidden="true"
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border font-ui text-xs font-bold ${
        own ? 'border-violet-400/30 bg-violet-500/10 text-violet-200' : 'border-line bg-surface-2 text-text-2'
      }`}
    >
      {letter}
    </span>
  );
}

function MessageBubble({ message, own }) {
  if (message.kind === 'SYSTEM') {
    return (
      <li className="py-1.5 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
          <span className="text-steel">System //</span> {message.body}
        </span>
      </li>
    );
  }
  return (
    <li className={`flex gap-2.5 py-2 ${own ? 'flex-row-reverse' : ''}`}>
      <Avatar name={message.displayName} own={own} />
      <div className={`min-w-0 max-w-[85%] ${own ? 'text-right' : ''}`}>
        <p className={`flex flex-wrap items-baseline gap-x-2 ${own ? 'justify-end' : ''}`}>
          <span className="truncate font-ui text-[13px] font-semibold text-text">{message.displayName}</span>
          <span className="tnum shrink-0 font-mono text-[10px] text-text-3">
            {message.publicId} · {formatTime(message.createdAt)}
          </span>
        </p>
        <div
          className={`mt-1 inline-block rounded-[6px] border px-3 py-2 text-left ${
            own ? 'border-violet-400/25 bg-violet-500/10' : 'border-line bg-surface-2/60'
          }`}
        >
          <p className="break-words text-sm leading-relaxed whitespace-pre-wrap text-text">{message.body}</p>
        </div>
      </div>
    </li>
  );
}

export default function RoomChatPanel({
  messages,
  chatEnabled,
  isHost,
  myPublicId,
  busy,
  error,
  onSend,
  onToggle,
}) {
  const [draft, setDraft] = useState('');
  const [stuck, setStuck] = useState(true);
  const [baseline, setBaseline] = useState(0);
  const [announce, setAnnounce] = useState('');
  const listRef = useRef(null);
  const mountedRef = useRef(false);
  const prevLenRef = useRef(0);
  const busyRef = useRef(false);
  busyRef.current = busy !== null;

  const newCount = stuck ? 0 : Math.max(0, messages.length - baseline);

  function scrollToBottom() {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setStuck(true);
    setBaseline(messages.length);
  }

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    setStuck(nearBottom);
    if (nearBottom) {
      setBaseline(messages.length);
    } else if (baseline > messages.length) {
      setBaseline(messages.length);
    }
  }

  // New arrivals: stay pinned when already at the bottom, otherwise count
  // them behind a pill. Announce politely (never the initial history).
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevLenRef.current = messages.length;
      setBaseline(messages.length);
      return;
    }
    const grew = messages.length > prevLenRef.current;
    prevLenRef.current = messages.length;
    if (!grew) return;
    const latest = messages[messages.length - 1];
    if (stuck) {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    } else if (latest && latest.kind === 'USER') {
      setAnnounce(`New message from ${latest.displayName}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  async function handleSubmit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busyRef.current) return;
    const ok = await onSend(text);
    if (ok) setDraft('');
  }

  return (
    <TacticalPanel className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <HUDLabel tone="steel">Chat // {chatEnabled ? 'On' : 'Off'}</HUDLabel>
        {isHost && (
          <TacticalButton
            variant="steel"
            size="sm"
            disabled={busy !== null}
            onClick={() => onToggle(!chatEnabled)}
            aria-pressed={chatEnabled}
          >
            {chatEnabled ? 'Turn Off' : 'Turn On'}
          </TacticalButton>
        )}
      </div>

      <div
        ref={listRef}
        onScroll={handleScroll}
        role="log"
        aria-label="Room messages"
        className="mt-3 max-h-[320px] min-h-[120px] overflow-y-auto border-y border-line py-1"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-8 text-center">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-text-2">
              No messages yet
            </p>
            <p className="max-w-xs text-sm text-text-3">Start the room when you&apos;re ready.</p>
          </div>
        ) : (
          <ul>
            {messages.map((m, i) => (
              <MessageBubble
                key={`${m.createdAt}-${i}`}
                message={m}
                own={!!myPublicId && m.publicId === myPublicId}
              />
            ))}
          </ul>
        )}
      </div>

      <span className="sr-only" role="status">
        {announce}
      </span>

      {newCount > 0 && (
        <div className="mt-2 flex justify-center">
          <TacticalButton variant="steel" size="sm" onClick={scrollToBottom}>
            New messages ({newCount})
          </TacticalButton>
        </div>
      )}

      {chatEnabled ? (
        <form className="mt-3 flex items-end gap-2" onSubmit={handleSubmit}>
          <div className="min-w-0 flex-1">
            <label htmlFor="room-chat-input" className="sr-only">
              Write a message
            </label>
            <input
              id="room-chat-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message…"
              maxLength={500}
              autoComplete="off"
              disabled={busy !== null}
              className="h-10 w-full rounded-[4px] border border-line bg-surface px-3.5 text-sm text-text placeholder:text-text-3 transition-all duration-150 focus:border-tact/60 focus:outline-none focus:ring-2 focus:ring-tact/25 disabled:opacity-50"
            />
          </div>
          <TacticalButton type="submit" variant="violet" size="md" disabled={busy !== null || !draft.trim()} className="shrink-0">
            <Send size={13} />
            Send
          </TacticalButton>
        </form>
      ) : (
        <p className="mt-3 rounded-[4px] border border-line bg-surface-2/60 px-3 py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-text-3" role="status">
          Chat disabled by room owner
        </p>
      )}

      {error && (
        <p className="mt-2 text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}
    </TacticalPanel>
  );
}
