/**
 * Chatbot & Knowledge Ingestion Controller
 * Provides endpoints for SwordNexi multi-tenant cross-department AI assistant.
 */
const { answerTenantQuery } = require('../utils/aiChatbotService');
const models = require('../models/mongodb');

/**
 * Handles incoming chat messages with strict multi-tenant isolation
 */
exports.queryChatbot = async (req, res) => {
    try {
        const { message, department = 'all', industry = 'all', history = [] } = req.body;

        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ success: false, msg: 'Message is required' });
        }

        const ownerId = req.ownerId;
        const tenantId = req.user?.tenantId || req.ownerId;

        if (!ownerId && !tenantId) {
            return res.status(401).json({ success: false, msg: 'Tenant authorization is missing' });
        }

        const effectiveIndustry = (industry && industry !== 'all' && industry !== 'general')
            ? industry
            : (req.user?.industry || industry || 'general');

        const result = await answerTenantQuery({
            ownerId,
            tenantId,
            userQuery: message.trim(),
            department,
            industry: effectiveIndustry,
            conversationHistory: Array.isArray(history) ? history : []
        });

        return res.json({
            success: true,
            reply: result.reply,
            sources: result.sources
        });
    } catch (err) {
        console.error('❌ [Chatbot Controller Error]:', err.message);
        return res.status(500).json({
            success: false,
            msg: 'Failed to process assistant query',
            error: err.message
        });
    }
};

/**
 * Ingests a new department policy, SOP, manual, or FAQ
 */
exports.ingestKnowledge = async (req, res) => {
    try {
        const { title, content, department = 'all', industry = 'all', category = 'faq', tags = [] } = req.body;

        if (!title || !content) {
            return res.status(400).json({ success: false, msg: 'Title and content are required' });
        }

        const ownerId = req.ownerId;
        const tenantId = req.user?.tenantId || req.ownerId;

        const newDoc = new models.DepartmentKnowledge({
            tenantId,
            ownerId,
            department: String(department).toLowerCase().trim(),
            industry: String(industry).toLowerCase().trim(),
            title: title.trim(),
            category: category.trim(),
            content: content.trim(),
            tags: Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim()).filter(Boolean),
            createdBy: req.user?.name || req.user?.email || 'admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        await newDoc.save();

        return res.status(201).json({
            success: true,
            msg: 'Department knowledge ingested successfully',
            doc: newDoc
        });
    } catch (err) {
        console.error('❌ [Knowledge Ingestion Error]:', err.message);
        return res.status(500).json({
            success: false,
            msg: 'Failed to ingest knowledge',
            error: err.message
        });
    }
};

/**
 * Lists ingested knowledge items for the current tenant
 */
exports.listKnowledge = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const tenantId = req.user?.tenantId || req.ownerId;
        const { department, category } = req.query;

        const filter = {
            $or: [{ ownerId }, { tenantId }]
        };

        if (department && department !== 'all') {
            filter.department = department;
        }

        if (category && category !== 'all') {
            filter.category = category;
        }

        const docs = await models.DepartmentKnowledge.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        return res.json({
            success: true,
            count: docs.length,
            docs
        });
    } catch (err) {
        console.error('❌ [List Knowledge Error]:', err.message);
        return res.status(500).json({
            success: false,
            msg: 'Failed to retrieve department knowledge',
            error: err.message
        });
    }
};

/**
 * Deletes an ingested knowledge item
 */
exports.deleteKnowledge = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const tenantId = req.user?.tenantId || req.ownerId;
        const { id } = req.params;

        const deleted = await models.DepartmentKnowledge.findOneAndDelete({
            _id: id,
            $or: [{ ownerId }, { tenantId }]
        });

        if (!deleted) {
            return res.status(404).json({ success: false, msg: 'Knowledge document not found or unauthorized' });
        }

        return res.json({
            success: true,
            msg: 'Knowledge document deleted successfully'
        });
    } catch (err) {
        console.error('❌ [Delete Knowledge Error]:', err.message);
        return res.status(500).json({
            success: false,
            msg: 'Failed to delete knowledge document',
            error: err.message
        });
    }
};

/**
 * Retrieves department & data statistics for the assistant
 */
exports.getChatbotStats = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const tenantId = req.user?.tenantId || req.ownerId;
        const filter = { $or: [{ ownerId }, { tenantId }] };

        const [productCount, lowStockCount, knowledgeCount, billCount] = await Promise.all([
            models.Product.countDocuments(filter),
            models.Product.countDocuments({ ...filter, quantity: { $lte: 5 } }),
            models.DepartmentKnowledge.countDocuments(filter),
            models.Bill.countDocuments(filter)
        ]);

        return res.json({
            success: true,
            stats: {
                totalProducts: productCount,
                lowStockProducts: lowStockCount,
                ingestedKnowledgeDocs: knowledgeCount,
                totalBills: billCount
            }
        });
    } catch (err) {
        console.error('❌ [Chatbot Stats Error]:', err.message);
        return res.status(500).json({
            success: false,
            msg: 'Failed to retrieve chatbot stats',
            error: err.message
        });
    }
};
