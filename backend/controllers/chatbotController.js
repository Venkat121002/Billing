/**
 * Chatbot & Knowledge Ingestion Controller
 * SwordNexi AI assistant. Everything here is scoped to the signed-in store and
 * works on MongoDB or Firestore (getCollection / storeRecords).
 */
const { answerTenantQuery } = require('../utils/aiChatbotService');
const { getCollection } = require('../utils/dbUtils');
const { countStoreRecords, listStoreRecords } = require('../utils/storeRecords');

const MAX_MESSAGE_LENGTH = 1000;   // each message is a paid AI call
const MAX_KNOWLEDGE_LENGTH = 20000;

const storeOwnerId = (req) => (req.user.role === 'owner' ? req.user.userId : req.user.ownerId);
const knowledgeCol = (req) => getCollection(req, 'departmentknowledge');

/**
 * Handles incoming chat messages for the caller's own store only.
 */
exports.queryChatbot = async (req, res) => {
    try {
        const { message, department = 'all' } = req.body;

        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ success: false, msg: 'Message is required' });
        }
        if (message.length > MAX_MESSAGE_LENGTH) {
            return res.status(400).json({ success: false, msg: `Please keep questions under ${MAX_MESSAGE_LENGTH} characters.` });
        }

        const ownerId = storeOwnerId(req);
        // The store's industry comes from the login token, not from the browser.
        const industry = req.user.industry || 'general';

        const result = await answerTenantQuery({
            ownerId,
            userQuery: message.trim(),
            department: String(department).slice(0, 50),
            industry
        });

        return res.json({ success: true, reply: result.reply, sources: result.sources });
    } catch (err) {
        console.error('❌ [Chatbot Controller Error]:', err.message);
        return res.status(500).json({ success: false, msg: 'Failed to process assistant query' });
    }
};

/**
 * Adds a store policy, SOP, manual or FAQ (owner only, see route).
 */
exports.ingestKnowledge = async (req, res) => {
    try {
        const { title, content, department = 'all', category = 'faq', tags = [] } = req.body;

        if (typeof title !== 'string' || typeof content !== 'string' || !title.trim() || !content.trim()) {
            return res.status(400).json({ success: false, msg: 'Title and content are required' });
        }
        if (content.length > MAX_KNOWLEDGE_LENGTH) {
            return res.status(400).json({ success: false, msg: `Content must be under ${MAX_KNOWLEDGE_LENGTH} characters.` });
        }

        const now = new Date().toISOString();
        const doc = {
            department: String(department).toLowerCase().trim().slice(0, 50),
            industry: req.user.industry || 'general',
            title: title.trim().slice(0, 200),
            category: String(category).trim().slice(0, 50),
            content: content.trim(),
            tags: (Array.isArray(tags) ? tags : String(tags).split(','))
                .map((t) => String(t).trim().slice(0, 40)).filter(Boolean).slice(0, 20),
            ownerId: storeOwnerId(req),
            createdBy: req.user.userId,
            createdAt: now,
            updatedAt: now
        };

        const ref = await knowledgeCol(req).add(doc);
        return res.status(201).json({
            success: true,
            msg: 'Department knowledge ingested successfully',
            doc: { id: ref.id, ...doc }
        });
    } catch (err) {
        console.error('❌ [Knowledge Ingestion Error]:', err.message);
        return res.status(500).json({ success: false, msg: 'Failed to ingest knowledge' });
    }
};

/**
 * Lists the store's knowledge items.
 */
exports.listKnowledge = async (req, res) => {
    try {
        const { department, category } = req.query;
        let docs = await listStoreRecords(storeOwnerId(req), 'departmentknowledge');
        if (department && department !== 'all') docs = docs.filter((d) => d.department === department);
        if (category && category !== 'all') docs = docs.filter((d) => d.category === category);
        docs = docs
            .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
            .map(({ _path, ...d }) => ({ ...d, id: d._id }));

        return res.json({ success: true, count: docs.length, docs });
    } catch (err) {
        console.error('❌ [List Knowledge Error]:', err.message);
        return res.status(500).json({ success: false, msg: 'Failed to retrieve department knowledge' });
    }
};

/**
 * Deletes one of the store's knowledge items (owner only, see route).
 */
exports.deleteKnowledge = async (req, res) => {
    try {
        const ref = knowledgeCol(req).doc(req.params.id);
        const doc = await ref.get();
        if (!doc.exists) {
            return res.status(404).json({ success: false, msg: 'Knowledge document not found' });
        }
        await ref.delete();
        return res.json({ success: true, msg: 'Knowledge document deleted successfully' });
    } catch (err) {
        console.error('❌ [Delete Knowledge Error]:', err.message);
        return res.status(500).json({ success: false, msg: 'Failed to delete knowledge document' });
    }
};

/**
 * Store data counts shown in the assistant panel.
 */
exports.getChatbotStats = async (req, res) => {
    try {
        const ownerId = storeOwnerId(req);
        const [products, knowledgeCount, billCount] = await Promise.all([
            listStoreRecords(ownerId, 'products'),
            countStoreRecords(ownerId, ['departmentknowledge']),
            countStoreRecords(ownerId, ['bills'])
        ]);

        return res.json({
            success: true,
            stats: {
                totalProducts: products.length,
                lowStockProducts: products.filter((p) => Number(p.quantity || 0) <= 5).length,
                ingestedKnowledgeDocs: knowledgeCount,
                totalBills: billCount
            }
        });
    } catch (err) {
        console.error('❌ [Chatbot Stats Error]:', err.message);
        return res.status(500).json({ success: false, msg: 'Failed to retrieve chatbot stats' });
    }
};
