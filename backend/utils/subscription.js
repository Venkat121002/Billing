// Single source of truth for the free-trial length.
const TRIAL_DAYS = 14;

const addDays = (from, days) => {
    const d = new Date(from);
    d.setDate(d.getDate() + days);
    return d;
};

/** Fresh trial subscription object, starting now. */
const newTrialSubscription = (now = new Date()) => ({
    plan: 'Trial',
    status: 'Active',
    startDate: now.toISOString(),
    endDate: addDays(now, TRIAL_DAYS).toISOString()
});

module.exports = { TRIAL_DAYS, addDays, newTrialSubscription };
