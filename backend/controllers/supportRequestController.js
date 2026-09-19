const store = require('../utils/platformStore');
const { VALID_INDUSTRIES } = require('../utils/industries');

const MAX_MESSAGE_LENGTH = 2000;
const REQUEST_TYPES = ['general', 'industry_change'];

// @desc    Submit a support message (general) or an industry-change request
// @route   POST /api/v2/support-requests
exports.createSupportRequest = async (req, res) => {
    try {
        const { userId, ownerId, role } = req.user;
        const tenantId = process.env.TENANT_ID;
        const { type, message, requestedIndustry } = req.body || {};

        if (!REQUEST_TYPES.includes(type)) {
            return res.status(400).json({ msg: 'Unknown request type.' });
        }

        const trimmedMessage = String(message || '').trim();
        if (!trimmedMessage) {
            return res.status(400).json({ msg: 'Message is required.' });
        }
        if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
            return res.status(400).json({ msg: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` });
        }

        const owner = await store.getOwner(ownerId);
        if (!owner) {
            return res.status(404).json({ msg: 'Owner record not found' });
        }

        const currentIndustry = owner.companyDetails?.industry || '';

        if (type === 'industry_change') {
            if (role !== 'owner') {
                return res.status(403).json({ msg: "Only the account owner can request an industry change." });
            }
            if (!VALID_INDUSTRIES.includes(requestedIndustry)) {
                return res.status(400).json({ msg: 'Please choose a valid industry.' });
            }
            if (requestedIndustry === currentIndustry) {
                return res.status(400).json({ msg: 'Your account is already on this industry.' });
            }

            const existing = (await store.listSupportRequests({ ownerId, type: 'industry_change', status: 'Pending' }, 1))[0];
            if (existing) {
                return res.status(409).json({ msg: 'You already have a pending industry change request.' });
            }
        }

        let requesterName = `${owner.firstName || ''} ${owner.lastName || ''}`.trim();
        let requesterEmail = owner.email || '';
        if (role === 'subuser') {
            const subUser = await store.getSubUser(ownerId, userId);
            requesterName = `${subUser?.firstName || ''} ${subUser?.lastName || ''}`.trim();
            requesterEmail = subUser?.email || '';
        }

        const created = await store.createSupportRequest({
            tenantId,
            ownerId,
            requestedBy: userId,
            requesterName,
            requesterEmail,
            requesterRole: role,
            businessName: owner.companyDetails?.name || '',
            type,
            message: trimmedMessage,
            currentIndustry,
            requestedIndustry: type === 'industry_change' ? requestedIndustry : '',
            status: 'Pending'
        });

        res.status(201).json(created);
    } catch (err) {
        console.error('Create Support Request Error:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

// @desc    The caller's own requests (owner sees the whole business's; a
//          sub-user sees only what they sent)
// @route   GET /api/v2/support-requests/mine
exports.getMySupportRequests = async (req, res) => {
    try {
        const { userId, ownerId, role } = req.user;

        const filter = { ownerId };
        if (role === 'subuser') filter.requestedBy = userId;

        const requests = await store.listSupportRequests(filter, 50);
        res.json(requests);
    } catch (err) {
        console.error('Get My Support Requests Error:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};
