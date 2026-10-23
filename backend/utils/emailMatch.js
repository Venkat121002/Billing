/**
 * Mongo filter value matching an email exactly but ignoring case, so signup
 * uniqueness, password reset and login all agree ("A@x.com" == "a@x.com").
 */
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const emailMatch = (email) => new RegExp(`^${escape(String(email).trim())}$`, 'i');

module.exports = { emailMatch };
