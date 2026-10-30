// The rebooking email (site setting rebook_nudge_days, edited in Admin > Settings): how many days
// after a completed visit a client is asked if they're ready for their next set. 0 turns it off;
// otherwise a whole number of days in this range.

export const MIN_REBOOK_NUDGE_DAYS = 7;
export const MAX_REBOOK_NUDGE_DAYS = 60;

/** Whether a number of days is one the setting accepts: 0 (off) or in range */
export const isRebookNudgeDays = (days: number) => Number.isInteger(days) && (days === 0 || (days >= MIN_REBOOK_NUDGE_DAYS && days <= MAX_REBOOK_NUDGE_DAYS));
