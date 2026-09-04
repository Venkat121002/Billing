
exports.createBroadcast = async (req, res) => {
    try {
        const db = require('../models');
        const Notification = db.Notification;

        console.log("CreateBroadcast User:", req.user);
        // Strict check for Superadmin
        if (req.user.role !== 'Superadmin') {
            console.log("Access Denied: Role is", req.user.role);
            return res.status(403).json({ msg: "Access Denied. Only Superadmin can send broadcasts." });
        }

        const { title, message, type, target_audience } = req.body;

        if (!title || !message) {
            return res.status(400).json({ msg: "Title and message are required" });
        }

        const notification = await Notification.create({
            title,
            message,
            type: type || 'Info',
            target_audience: target_audience || 'All',
            created_by: req.user.id
        });

        res.json({ msg: "Notification broadcast sent successfully", notification });

    } catch (err) {
        console.error("Create Broadcast Error:", err);
        res.status(500).send("Server Error");
    }
};

exports.getMyNotifications = async (req, res) => {
    try {
        const db = require('../models');
        const Notification = db.Notification;
        const User = db.User;
        const { Op } = require('sequelize');

        const userRole = req.user.role; // 'TenantAdmin' or 'User' (or 'Superadmin')

        // Fetch notifications that target 'All' OR the specific user role
        // For Superadmin, show everything or just 'All'? Let's show 'All' and 'Superadmin' if we had that, but for now just All.

        const whereClause = {
            target_audience: {
                [Op.in]: ['All', userRole]
            }
        };

        const notifications = await Notification.findAll({
            where: whereClause,
            include: [{
                model: User,
                attributes: ['email', 'name'] // Fetch sender's email and name
            }],
            order: [['createdAt', 'DESC']],
            limit: 20 // Limit to last 20 messages
        });

        res.json(notifications);

    } catch (err) {
        console.error("Get Notifications Error:", err);
        res.status(500).send("Server Error");
    }
};
