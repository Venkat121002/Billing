const mongoose = require('mongoose');

const DepartmentKnowledgeSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    department: { type: String, required: true, index: true }, // e.g. 'clothing', 'alterations', 'inventory', 'billing', 'customer_service', 'all'
    industry: { type: String, default: 'all', index: true },   // e.g. 'clothing', 'pharmacy', 'mobile_shop', 'all'
    title: { type: String, required: true },
    category: { type: String, default: 'faq' }, // 'policy', 'manual', 'faq', 'sop', 'product_guide'
    content: { type: String, required: true },
    tags: [{ type: String }],
    createdBy: { type: String, default: 'system' },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false
});

DepartmentKnowledgeSchema.index({ tenantId: 1, ownerId: 1 });
DepartmentKnowledgeSchema.index({ tenantId: 1, department: 1 });
DepartmentKnowledgeSchema.index({ tenantId: 1, ownerId: 1, department: 1 });

module.exports = mongoose.model('DepartmentKnowledge', DepartmentKnowledgeSchema);
