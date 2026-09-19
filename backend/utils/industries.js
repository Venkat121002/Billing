// Keep in sync with the selectable keys in
// frontend/src/config/industryProfiles.js (getSelectableProfiles()) — this
// backend list only exists to reject garbage input; the frontend profile
// config is the actual source of truth for behaviour.
const VALID_INDUSTRIES = [
    'grocery', 'pharmacy', 'mobile_shop', 'clothing', 'petshop',
    'academy', 'software_development'
];

module.exports = { VALID_INDUSTRIES };
