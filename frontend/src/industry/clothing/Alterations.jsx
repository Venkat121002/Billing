import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import API_URL from '../../config/api';
import BillingLayout from '../../Layout/BillingLayout/AdminLayout';
import {
    Scissors,
    Plus,
    Search,
    Clock,
    CheckCircle2,
    Truck,
    AlertCircle,
    Printer,
    Send,
    Trash2,
    Calendar,
    User,
    Phone,
    Shirt,
    Tag,
    IndianRupee,
    X,
    Filter,
    RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import Barcode from 'react-barcode';

const COMMON_ALTERATIONS = [
    'Length Hemming',
    'Waist Tighten',
    'Waist Loosen',
    'Sleeve Shortening',
    'Chest / Body Fitting',
    'Shoulder Adjustment',
    'Tapering / Leg Slimming',
    'Zipper Replacement',
    'Button Stitching',
    'Blouse Neck Adjustment'
];

const STATUS_CONFIG = {
    'Received': { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    'In Alteration': { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Scissors },
    'Ready for Pickup': { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    'Delivered': { bg: 'bg-gray-100 text-gray-700 border-gray-200', icon: Truck },
    'Cancelled': { bg: 'bg-red-50 text-red-700 border-red-200', icon: AlertCircle }
};

const getAuthHeaders = () => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    return {
        "x-auth-token": token || "",
        Authorization: token ? `Bearer ${token}` : ""
    };
};

const Alterations = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTicketForPrint, setSelectedTicketForPrint] = useState(null);
    const [isNotifying, setIsNotifying] = useState({});

    // New Ticket Form
    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        garmentName: '',
        barcode: '',
        brand: '',
        color: '',
        size: '',
        alterationTypes: ['Length Hemming'],
        notes: '',
        promisedDate: '',
        tailorName: '',
        charge: 0,
        isPaid: false,
        status: 'Received'
    });

    const slipPrintRef = useRef(null);
    const handlePrintSlip = useReactToPrint({
        contentRef: slipPrintRef,
        documentTitle: `Alteration_Slip_${selectedTicketForPrint?.ticketNo || 'Ticket'}`
    });

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/alteration-tickets`, {
                headers: getAuthHeaders()
            });
            setTickets(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to fetch alteration tickets:', err);
            toast.error('Could not load alteration tickets');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        if (!formData.customerName || !formData.garmentName) {
            toast.error('Please enter customer name and garment description');
            return;
        }

        try {
            const res = await axios.post(`${API_URL}/alteration-tickets`, formData, {
                headers: getAuthHeaders()
            });

            toast.success(`Ticket #${res.data.ticketNo} created!`);
            setIsModalOpen(false);
            fetchTickets();

            // Set for printing slip
            setSelectedTicketForPrint(res.data);
            setTimeout(() => {
                if (slipPrintRef.current) handlePrintSlip();
            }, 300);

            // Reset form
            setFormData({
                customerName: '',
                customerPhone: '',
                garmentName: '',
                barcode: '',
                brand: '',
                color: '',
                size: '',
                alterationTypes: ['Length Hemming'],
                notes: '',
                promisedDate: '',
                tailorName: '',
                charge: 0,
                isPaid: false,
                status: 'Received'
            });
        } catch (err) {
            console.error('Create ticket error:', err);
            toast.error(err.response?.data?.msg || 'Failed to create alteration ticket');
        }
    };

    const handleUpdateStatus = async (ticketId, newStatus) => {
        try {
            await axios.put(`${API_URL}/alteration-tickets/${ticketId}`, { status: newStatus }, {
                headers: getAuthHeaders()
            });

            toast.success(`Ticket marked as ${newStatus}`);
            if (newStatus === 'Ready for Pickup') {
                toast.success('Automated WhatsApp alert sent to customer! 📲', { duration: 4000 });
            }
            fetchTickets();
        } catch (err) {
            console.error('Update status error:', err);
            toast.error('Failed to update status');
        }
    };

    const handleSendWhatsAppNotification = async (ticket) => {
        if (!ticket.customerPhone) {
            toast.error('Customer phone number not available');
            return;
        }

        try {
            setIsNotifying(prev => ({ ...prev, [ticket.id || ticket._id]: true }));
            await axios.post(`${API_URL}/alteration-tickets/${ticket.id || ticket._id}/notify`, {}, {
                headers: getAuthHeaders()
            });

            toast.success(`WhatsApp alert dispatched to ${ticket.customerPhone}! 📲`);
        } catch (err) {
            console.error('Notify error:', err);
            toast.error('Failed to send WhatsApp alert');
        } finally {
            setIsNotifying(prev => ({ ...prev, [ticket.id || ticket._id]: false }));
        }
    };

    const handleDeleteTicket = async (ticketId) => {
        if (!window.confirm('Are you sure you want to delete this alteration ticket?')) return;
        try {
            await axios.delete(`${API_URL}/alteration-tickets/${ticketId}`, {
                headers: getAuthHeaders()
            });
            toast.success('Ticket deleted');
            fetchTickets();
        } catch (err) {
            toast.error('Failed to delete ticket');
        }
    };

    const toggleAlterationType = (type) => {
        setFormData(prev => {
            const exists = prev.alterationTypes.includes(type);
            return {
                ...prev,
                alterationTypes: exists
                    ? prev.alterationTypes.filter(t => t !== type)
                    : [...prev.alterationTypes, type]
            };
        });
    };

    // Filter tickets
    const filteredTickets = tickets.filter(t => {
        const matchesSearch =
            (t.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.customerPhone || '').includes(searchTerm) ||
            (t.ticketNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.garmentName || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const statusCounts = {
        All: tickets.length,
        Received: tickets.filter(t => t.status === 'Received').length,
        'In Alteration': tickets.filter(t => t.status === 'In Alteration').length,
        'Ready for Pickup': tickets.filter(t => t.status === 'Ready for Pickup').length,
        Delivered: tickets.filter(t => t.status === 'Delivered').length
    };

    return (
        <BillingLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-pink-50 text-pink-600 rounded-xl">
                            <Scissors size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Tailoring & Alteration Tracker</h1>
                            <p className="text-sm text-gray-500">
                                Manage garment fittings, alteration slips, and automated WhatsApp pickup alerts.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchTickets}
                            className="p-2.5 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-xl shadow-sm transition-all"
                        >
                            <Plus size={18} />
                            New Alteration Ticket
                        </button>
                    </div>
                </div>

                {/* Filter and Stats Tabs */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {['All', 'Received', 'In Alteration', 'Ready for Pickup', 'Delivered'].map(status => {
                        const active = statusFilter === status;
                        return (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`p-4 rounded-xl border text-left transition-all ${
                                    active
                                        ? 'bg-pink-50 border-pink-300 ring-2 ring-pink-500/20 shadow-sm'
                                        : 'bg-white border-gray-100 hover:border-gray-200'
                                }`}
                            >
                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{status}</div>
                                <div className={`text-2xl font-bold mt-1 ${active ? 'text-pink-600' : 'text-gray-800'}`}>
                                    {statusCounts[status] || 0}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by ticket number, customer name, mobile, or garment..."
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-sm shadow-sm"
                    />
                </div>

                {/* Tickets Table / List */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="py-20 text-center text-gray-400 flex flex-col items-center">
                            <RefreshCw className="animate-spin mb-3 text-pink-500" size={32} />
                            <p>Loading alteration tickets...</p>
                        </div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="py-20 text-center text-gray-400">
                            <Scissors className="mx-auto mb-3 text-gray-300" size={40} />
                            <p className="text-base font-medium text-gray-700">No alteration tickets found</p>
                            <p className="text-sm text-gray-400 mt-1">Create a new ticket when a customer requests pant hemming, sleeve fitting, etc.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50/75 border-b border-gray-100 text-xs font-semibold uppercase text-gray-500">
                                    <tr>
                                        <th className="py-3.5 px-4">Ticket</th>
                                        <th className="py-3.5 px-4">Customer</th>
                                        <th className="py-3.5 px-4">Garment & Alterations</th>
                                        <th className="py-3.5 px-4">Promised Date</th>
                                        <th className="py-3.5 px-4">Tailor & Charge</th>
                                        <th className="py-3.5 px-4">Status</th>
                                        <th className="py-3.5 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredTickets.map(ticket => {
                                        const statusConf = STATUS_CONFIG[ticket.status] || STATUS_CONFIG['Received'];
                                        const StatusIcon = statusConf.icon;

                                        return (
                                            <tr key={ticket.id || ticket._id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="py-4 px-4 font-mono font-bold text-gray-900">
                                                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs">
                                                        {ticket.ticketNo}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="font-medium text-gray-900">{ticket.customerName}</div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                        <Phone size={12} /> {ticket.customerPhone || 'No phone'}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="font-medium text-gray-900 flex items-center gap-1.5">
                                                        <Shirt size={14} className="text-pink-500" />
                                                        {ticket.garmentName}
                                                        {(ticket.size || ticket.color) && (
                                                            <span className="text-xs text-gray-400">
                                                                ({[ticket.size, ticket.color].filter(Boolean).join(', ')})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {(ticket.alterationTypes || []).map((alt, i) => (
                                                            <span key={i} className="text-[11px] bg-pink-50 text-pink-700 px-1.5 py-0.5 rounded border border-pink-100 font-medium">
                                                                {alt}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-700">
                                                        <Calendar size={13} className="text-gray-400" />
                                                        {ticket.promisedDate ? new Date(ticket.promisedDate).toLocaleDateString('en-IN') : 'Not set'}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="font-semibold text-gray-900">
                                                        ₹{ticket.charge || 0}
                                                        <span className={`text-[10px] ml-1.5 px-1.5 py-0.5 rounded font-normal ${ticket.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {ticket.isPaid ? 'Paid' : 'Unpaid'}
                                                        </span>
                                                    </div>
                                                    {ticket.tailorName && (
                                                        <div className="text-xs text-gray-500 mt-0.5">Tailor: {ticket.tailorName}</div>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <select
                                                        value={ticket.status}
                                                        onChange={(e) => handleUpdateStatus(ticket.id || ticket._id, e.target.value)}
                                                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none cursor-pointer ${statusConf.bg}`}
                                                    >
                                                        <option value="Received">Received</option>
                                                        <option value="In Alteration">In Alteration</option>
                                                        <option value="Ready for Pickup">Ready for Pickup</option>
                                                        <option value="Delivered">Delivered</option>
                                                        <option value="Cancelled">Cancelled</option>
                                                    </select>
                                                </td>
                                                <td className="py-4 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedTicketForPrint(ticket);
                                                                setTimeout(() => handlePrintSlip(), 200);
                                                            }}
                                                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                                                            title="Print Alteration Pin Slip"
                                                        >
                                                            <Printer size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleSendWhatsAppNotification(ticket)}
                                                            disabled={isNotifying[ticket.id || ticket._id]}
                                                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg disabled:opacity-50"
                                                            title="Dispatch WhatsApp Ready Alert"
                                                        >
                                                            <Send size={16} className={isNotifying[ticket.id || ticket._id] ? 'animate-spin' : ''} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteTicket(ticket.id || ticket._id)}
                                                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: New Alteration Ticket */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
                                    <Scissors size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">New Alteration Ticket</h3>
                                    <p className="text-xs text-gray-500">Attach slip to garment and notify customer when ready</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTicket} className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.customerName}
                                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                        placeholder="e.g. Rahul Sharma"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Mobile (WhatsApp) *</label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.customerPhone}
                                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                        placeholder="10-digit mobile number"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Garment Description *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.garmentName}
                                        onChange={(e) => setFormData({ ...formData, garmentName: e.target.value })}
                                        placeholder="e.g. Slim Fit Jeans / Cotton Kurta"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Size & Color</label>
                                    <input
                                        type="text"
                                        value={formData.size}
                                        onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                                        placeholder="e.g. 32 / Blue"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Alteration Type Checkboxes */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-2">Alteration Services Needed</label>
                                <div className="flex flex-wrap gap-2">
                                    {COMMON_ALTERATIONS.map(alt => {
                                        const selected = formData.alterationTypes.includes(alt);
                                        return (
                                            <button
                                                type="button"
                                                key={alt}
                                                onClick={() => toggleAlterationType(alt)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                                    selected
                                                        ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                                                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                                }`}
                                            >
                                                {alt}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Promised Date</label>
                                    <input
                                        type="date"
                                        value={formData.promisedDate}
                                        onChange={(e) => setFormData({ ...formData, promisedDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Tailor</label>
                                    <input
                                        type="text"
                                        value={formData.tailorName}
                                        onChange={(e) => setFormData({ ...formData, tailorName: e.target.value })}
                                        placeholder="Tailor name / Master"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Alteration Charge (₹)</label>
                                    <input
                                        type="number"
                                        value={formData.charge}
                                        onChange={(e) => setFormData({ ...formData, charge: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isPaidCheck"
                                    checked={formData.isPaid}
                                    onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                                    className="rounded border-gray-300 text-pink-600 focus:ring-pink-500 w-4 h-4"
                                />
                                <label htmlFor="isPaidCheck" className="text-xs font-medium text-gray-700 cursor-pointer">
                                    Already Paid by Customer
                                </label>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Tailor Instructions / Special Notes</label>
                                <textarea
                                    rows="2"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="e.g. Cut 1.5 inches from bottom, keep original stitch finish..."
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                                />
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-xl shadow-sm"
                                >
                                    Create & Print Slip
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Printable Alteration Slip (Pin Tag) */}
            <div className="hidden">
                <div ref={slipPrintRef} className="p-4 w-[80mm] text-black font-sans text-xs">
                    <div className="text-center border-b pb-2 mb-2">
                        <h2 className="text-base font-bold uppercase tracking-wider">ALTERATION SLIP</h2>
                        <p className="text-[10px] text-gray-600">Attach this slip to the garment</p>
                    </div>

                    {selectedTicketForPrint && (
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-sm font-bold">
                                <span>TICKET:</span>
                                <span className="font-mono">{selectedTicketForPrint.ticketNo}</span>
                            </div>

                            <div className="my-2 flex justify-center">
                                <Barcode
                                    value={selectedTicketForPrint.ticketNo || 'ALT-1000'}
                                    width={1.2}
                                    height={35}
                                    fontSize={10}
                                />
                            </div>

                            <div className="border-t border-b py-1.5 space-y-1">
                                <div><strong>Customer:</strong> {selectedTicketForPrint.customerName}</div>
                                <div><strong>Mobile:</strong> {selectedTicketForPrint.customerPhone}</div>
                                <div><strong>Garment:</strong> {selectedTicketForPrint.garmentName}</div>
                                <div><strong>Size / Color:</strong> {[selectedTicketForPrint.size, selectedTicketForPrint.color].filter(Boolean).join(' / ') || 'N/A'}</div>
                            </div>

                            <div className="py-1">
                                <strong>Work Needed:</strong>
                                <ul className="list-disc list-inside mt-0.5 text-[11px]">
                                    {(selectedTicketForPrint.alterationTypes || []).map((alt, i) => (
                                        <li key={i}>{alt}</li>
                                    ))}
                                </ul>
                                {selectedTicketForPrint.notes && (
                                    <div className="mt-1 italic text-[10px]">"{selectedTicketForPrint.notes}"</div>
                                )}
                            </div>

                            <div className="border-t pt-1.5 space-y-1 text-[11px]">
                                <div><strong>Promised Date:</strong> {selectedTicketForPrint.promisedDate || 'Urgent'}</div>
                                <div><strong>Tailor:</strong> {selectedTicketForPrint.tailorName || 'Master'}</div>
                                <div className="font-bold">
                                    <strong>Amount:</strong> ₹{selectedTicketForPrint.charge || 0}
                                    <span className="ml-1">({selectedTicketForPrint.isPaid ? 'PAID' : 'DUE ON PICKUP'})</span>
                                </div>
                            </div>

                            <div className="border-t pt-2 text-center text-[9px] text-gray-500">
                                WhatsApp alert will be sent upon completion.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </BillingLayout>
    );
};

export default Alterations;
