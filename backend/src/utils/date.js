/**
 * Date helpers for "day" and "week" boundaries.
 *
 * Timezone policy: the whole backend evaluates days/weeks in the server's
 * local timezone (consistent with streakService, which also uses local
 * `new Date()`). "Today" is therefore the same everywhere in this app.
 */

/** Start of the day (00:00:00.000) for a given date/time, in local time. */
function startOfDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Exclusively after the day (00:00:00.000 of the next day). */
function endOfDay(value) {
  const d = startOfDay(value);
  d.setDate(d.getDate() + 1);
  return d;
}

/** Monotonic, timezone-stable day key used for "distinct active days". */
function dayKey(value) {
  const d = startOfDay(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Add days to a date/time (returns a new Date). */
function addDays(value, days) {
  const d = new Date(value);
  d.setDate(d.getDate() + days);
  return d;
}

/** Start of the week (Monday 00:00:00.000) containing the given date. */
function startOfWeek(value) {
  const d = startOfDay(value);
  const offsetToMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offsetToMonday);
  return d;
}

/** End of the week (exclusive: the following Monday at 00:00). */
function endOfWeek(value) {
  return addDays(startOfWeek(value), 7);
}

module.exports = { startOfDay, endOfDay, dayKey, addDays, startOfWeek, endOfWeek };