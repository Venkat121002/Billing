/**
 * Demand Forecasting & Smart Restock Engine
 * Feature 7 of Phase 2 Automation.
 *
 * Analyzes historical sales velocity across Bills and GST Invoices,
 * forecasts next 7-14 days of customer demand, and recommends optimal reorder quantities.
 */
const { getGeminiModel, isGeminiConfigured } = require('../config/gemini');
const { listStoreRecords } = require('./storeRecords');

/**
 * Calculates demand forecast and restock suggestions for a store
 */
async function generateDemandForecast({ ownerId, tenantId, lookbackDays = 30, forecastDays = 7 }) {
    try {
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - Number(lookbackDays));
        const sinceIso = sinceDate.toISOString();

        // 1. Fetch current inventory products
        const products = await listStoreRecords(ownerId, 'products');

        // 2. Fetch past bills within the lookback window
        const [standardBills, gstBills] = await Promise.all([
            listStoreRecords(ownerId, 'bills', { since: sinceIso }),
            listStoreRecords(ownerId, 'gstBills', { since: sinceIso })
        ]);

        // 3. Aggregate sales by product
        const salesStats = {}; // key: productId or normalized name

        const recordSale = (item) => {
            const rawId = item.productId || item.id || item._id;
            const name = String(item.productName || item.name || '').trim();
            const sku = item.productSku || item.sku || '';
            const key = rawId ? String(rawId) : (sku || name.toLowerCase());
            if (!key) return;

            const qty = Number(item.qty || item.quantity || 1);
            const total = Number(item.total || (qty * Number(item.price || item.rate || 0)));

            if (!salesStats[key]) {
                salesStats[key] = {
                    key,
                    name,
                    sku,
                    totalQuantitySold: 0,
                    totalRevenue: 0,
                    billCount: 0
                };
            }

            salesStats[key].totalQuantitySold += qty;
            salesStats[key].totalRevenue += total;
            salesStats[key].billCount += 1;
        };

        standardBills.forEach(b => {
            if (Array.isArray(b.items)) b.items.forEach(recordSale);
        });

        gstBills.forEach(b => {
            if (Array.isArray(b.items)) b.items.forEach(recordSale);
        });

        // 4. Generate forecast metrics per product
        const forecastItems = [];
        let totalRestockUnits = 0;
        let estimatedRestockCost = 0;
        let criticalItemsCount = 0;
        let warningItemsCount = 0;

        for (const prod of products) {
            const prodId = String(prod._id || prod.id);
            const prodSku = String(prod.sku || '');
            const prodName = String(prod.name || '').trim();

            const stat = salesStats[prodId] ||
                         (prodSku && salesStats[prodSku]) ||
                         salesStats[prodName.toLowerCase()] ||
                         { totalQuantitySold: 0, totalRevenue: 0, billCount: 0 };

            const totalSold = stat.totalQuantitySold;
            const dailyVelocity = +(totalSold / Number(lookbackDays)).toFixed(3);
            const weeklyVelocity = +(dailyVelocity * 7).toFixed(2);

            const currentStock = Number(prod.quantity || 0) * (Number(prod.unit) || 1);
            const minStock = Number(prod.minStockAlert || prod.minimumStock || 5);
            const costPrice = Number(prod.purchasePrice || prod.costPrice || (Number(prod.salePrice || prod.price || 0) * 0.7));
            const salePrice = Number(prod.salePrice || prod.price || 0);

            // Projected demand for the next forecast window (e.g. 7 days)
            const projectedDemand = Math.ceil(dailyVelocity * Number(forecastDays));

            // Stock runway (days until stock reaches 0)
            let daysOfStockLeft = null;
            if (dailyVelocity > 0) {
                daysOfStockLeft = +(currentStock / dailyVelocity).toFixed(1);
            } else if (currentStock > 0) {
                daysOfStockLeft = 999; // Sufficient / Slow moving
            } else {
                daysOfStockLeft = 0;
            }

            // Suggested reorder formula:
            // Need enough for forecastDays + safety buffer (minStock), minus current stock
            let suggestedReorder = 0;
            if (currentStock <= 0) {
                suggestedReorder = Math.max(minStock * 2, projectedDemand + minStock);
            } else if (daysOfStockLeft <= Number(forecastDays) || currentStock <= minStock) {
                const deficit = (projectedDemand + minStock) - currentStock;
                suggestedReorder = Math.max(0, Math.ceil(deficit));
            }

            // Determine health / urgency status
            let status = 'healthy';
            let urgencyScore = 0;

            if (currentStock <= 0) {
                status = 'critical';
                urgencyScore = 100;
                criticalItemsCount++;
            } else if (daysOfStockLeft <= 3) {
                status = 'critical';
                urgencyScore = 80;
                criticalItemsCount++;
            } else if (daysOfStockLeft <= 7 || currentStock <= minStock) {
                status = 'reorder_soon';
                urgencyScore = 60;
                warningItemsCount++;
            } else if (totalSold === 0 && currentStock > 0) {
                status = 'slow_moving';
                urgencyScore = 10;
            } else {
                status = 'healthy';
                urgencyScore = 30;
            }

            const itemRestockCost = +(suggestedReorder * costPrice).toFixed(2);
            totalRestockUnits += suggestedReorder;
            estimatedRestockCost += itemRestockCost;

            forecastItems.push({
                productId: prodId,
                name: prodName,
                sku: prodSku,
                category: prod.category || 'General',
                currentStock,
                minStock,
                costPrice,
                salePrice,
                totalSoldInLookback: totalSold,
                dailyVelocity,
                weeklyVelocity,
                projectedDemand,
                daysOfStockLeft,
                suggestedReorder,
                estimatedCost: itemRestockCost,
                status,
                urgencyScore
            });
        }

        // Sort descending by urgency score, then by daily velocity
        forecastItems.sort((a, b) => b.urgencyScore - a.urgencyScore || b.dailyVelocity - a.dailyVelocity);

        // 5. Generate AI insights if Gemini is available
        let aiAdvice = null;
        if (isGeminiConfigured() && forecastItems.length > 0) {
            try {
                const model = getGeminiModel();
                if (model) {
                    const topCritical = forecastItems.filter(i => i.status === 'critical').slice(0, 5).map(i => `${i.name} (Stock: ${i.currentStock}, Sugg. Order: ${i.suggestedReorder})`);
                    const topMoving = forecastItems.slice(0, 5).map(i => `${i.name} (Weekly Sold: ${i.weeklyVelocity})`);

                    const prompt = `As a smart Indian retail inventory manager, analyze this store's stock report:
Lookback period: ${lookbackDays} days
Critical/Out-of-stock items: ${topCritical.join(', ') || 'None'}
Fastest moving products: ${topMoving.join(', ') || 'None'}
Total suggested restock units: ${totalRestockUnits}
Estimated procurement budget: Rs. ${estimatedRestockCost}

Provide 3 brief, actionable bullet points (max 15 words each) advising the business owner on what to restock first, supplier negotiation, or inventory optimization.`;

                    const result = await model.generateContent(prompt);
                    aiAdvice = result.response.text().trim();
                }
            } catch (err) {
                console.warn('⚠️ [DemandForecast] Gemini advice generation skipped:', err.message);
            }
        }

        return {
            success: true,
            lookbackDays: Number(lookbackDays),
            forecastDays: Number(forecastDays),
            totalProductsTracked: products.length,
            criticalItemsCount,
            warningItemsCount,
            totalRestockUnits,
            estimatedRestockCost: +estimatedRestockCost.toFixed(2),
            aiAdvice,
            items: forecastItems,
            restockRecommendations: forecastItems.filter(i => i.suggestedReorder > 0)
        };
    } catch (err) {
        console.error('❌ Demand Forecast Error:', err);
        throw err;
    }
}

module.exports = {
    generateDemandForecast
};
