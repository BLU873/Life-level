import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

/**
 * useFocusTimer — live countdown bound to the persisted FocusSession.
 *
 * The backend is authoritative: remaining time is always derived from the
 * session's stored timestamps (startedAt / totalSeconds / plannedSeconds),
 * so refresh, navigation and reopening Command never reset the timer.
 * The local interval only drives the display.
 *
 * Session shape (from GET /api/focus):
 *   { id, questId, mode, plannedSeconds, totalSeconds, status, startedAt, ... }
 * Status: ACTIVE | PAUSED | COMPLETED | CANCELLED
 */

export function remainingSeconds(session, nowMs) {
  if (!session) return 0;
  const banked = session.totalSeconds ?? 0;
  const planned = session.plannedSeconds ?? 0;
  if (session.status === 'PAUSED') return Math.max(0, planned - banked);
  if (session.status !== 'ACTIVE') return 0;
  const elapsed = Math.max(0, Math.floor((nowMs - new Date(session.startedAt).getTime()) / 1000));
  return Math.max(0, planned - banked - elapsed);
}

export function formatCountdown(totalSecs) {
  const s = Math.max(0, Math.floor(totalSecs));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export async function fetchActiveFocus() {
  const res = await api.get('/focus');
  return {
    session: res.data.data.session || null,
    // History rides the same response (today/week/month focus totals) —
    // no extra request needed by consumers such as the daily arc.
    history: res.data.data.history || null,
  };
}

export function isFocusConflict(err) {
  // NOTE: the shared api interceptor normalizes error bodies to plain
  // message strings, so the machine code is usually gone by the time we
  // see the error. Within POST /focus, the ONLY 409 the backend emits is
  // FOCUS_ALREADY_RUNNING, so status alone identifies it there.
  if (err?.response?.status !== 409) return false;
  const bodyError = err?.response?.data?.error;
  if (bodyError && typeof bodyError === 'object') return bodyError.code === 'FOCUS_ALREADY_RUNNING';
  return /already running/i.test(String(bodyError || ''));
}

export function focusConflictMessage() {
  return 'FOCUS SESSION ALREADY ACTIVE — finish or stop the current timer before deploying another timed Operation.';
}

/** API errors are { error: { code, message } } — never render the object itself. */
export function focusErrorMessage(err, fallback) {
  const bodyError = err?.response?.data?.error;
  if (typeof bodyError === 'string') return bodyError;
  if (typeof bodyError?.message === 'string') return bodyError.message;
  return fallback;
}

export function useFocusTimer() {
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // 'pause' | 'resume' | 'stop' | 'complete' | null
  const [error, setError] = useState('');
  const [justCompleted, setJustCompleted] = useState(null); // { rewards, totalSeconds, mode }
  const [nowMs, setNowMs] = useState(() => Date.now());
  const completingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const { session: active, history: hist } = await fetchActiveFocus();
      setSession(active);
      setHistory(hist);
      return active;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchActiveFocus()
      .then(({ session: active, history: hist }) => {
        if (cancelled) return;
        setSession(active);
        setHistory(hist);
      })
      .catch(() => {
        // Focus is optional surface — never break the page if it fails.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Display tick — only while running. Paused remaining is static.
  useEffect(() => {
    if (!session || session.status !== 'ACTIVE') return undefined;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [session?.id, session?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const remaining = remainingSeconds(session, nowMs);

  async function mutate(action) {
    if (!session || busy) return null;
    setBusy(action);
    setError('');
    try {
      const res = await api.post(`/focus/${session.id}/${action}`);
      return res.data.data.session || null;
    } catch (err) {
      // Session already closed server-side (e.g. completed elsewhere) — clear it.
      if (err?.response?.status === 409 && err?.response?.data?.error === 'FOCUS_CLOSED') {
        setSession(null);
        return null;
      }
      setError(focusErrorMessage(err, `Could not ${action} the focus timer.`));
      return undefined;
    } finally {
      setBusy(null);
    }
  }

  const pause = useCallback(async () => {
    const updated = await mutate('pause');
    if (updated) setSession(updated);
  }, [session, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  const resume = useCallback(async () => {
    const updated = await mutate('resume');
    if (updated) {
      setSession(updated);
      setNowMs(Date.now());
    }
  }, [session, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  const stop = useCallback(async () => {
    const updated = await mutate('cancel');
    // cancel returns the CANCELLED session — it is no longer active.
    if (updated !== undefined) setSession(null);
  }, [session, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  // Natural completion: countdown reached zero while ACTIVE.
  useEffect(() => {
    if (!session || session.status !== 'ACTIVE' || remaining > 0 || completingRef.current || busy) return;
    completingRef.current = true;
    setBusy('complete');
    api
      .post(`/focus/${session.id}/complete`)
      .then((res) => {
        const data = res.data.data;
        setJustCompleted({
          rewards: data?.rewards || { xp: 0, gold: 0 },
          totalSeconds: data?.session?.totalSeconds ?? session.plannedSeconds,
          mode: data?.session?.mode || session.mode,
        });
        setSession(null);
      })
      .catch(() => {
        // If completion failed (already closed etc.), drop the dead session.
        setSession(null);
      })
      .finally(() => {
        completingRef.current = false;
        setBusy(null);
      });
  }, [session, remaining, busy]);

  const clearCompleted = useCallback(() => setJustCompleted(null), []);

  return {
    session,
    history,
    loading,
    busy,
    error,
    remaining,
    justCompleted,
    clearCompleted,
    pause,
    resume,
    stop,
    refresh,
    setSession,
  };
}
