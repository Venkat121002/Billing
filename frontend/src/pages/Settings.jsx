
import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Users,
  Settings2,
  Palette,
  FileText,
  CreditCard,
  Plug,
  Code2,
  Link,
  User,
  ChevronRight,
  Shield,
  Mail,
  X,
  ArrowLeft,
  Printer,
  Plus,
  Trash2,
  Tags
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleEnterToNext } from '../utils/formUtils';
import BillingLayout from '../Layout/BillingLayout/AdminLayout';
import { resolveIndustryProfile, hasChosenIndustry, getSelectableProfiles } from '../config/industryProfiles';
import useItemCategories from '../hooks/useItemCategories';
import { formatInvoiceNumber } from '../utils/invoiceNumber';
import { DEFAULT_INVOICE_TERMS } from '../components/Billing/GstInvoice';
import ItemCategoriesManager from '../components/Settings/ItemCategoriesManager';

// Each settings section renders inline as a card under the active tab
// (it used to open as a popup from a launcher card).
const SettingsPanel = ({ children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">{children}</div>
);

// Old `?section=` links (sidebar, nudge banner) → the tab that now holds it.
const SECTION_TO_TAB = {
  profile: 'profile',
  account_stats: 'profile',
  subscriptions: 'subscription',
  support: 'support',
  invoice: 'billing',
  tax_rates: 'billing',
  printer: 'printing',
  item_categories: 'products',
  sub_users: 'team',
  security: 'security',
};

// Tabs that show the plan / account summary column on the right.
const TABS_WITH_SUMMARY = ['profile', 'billing', 'printing', 'security', 'subscription', 'support'];

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const currentTabRef = useRef('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [supportQuery, setSupportQuery] = useState('');
  const [submittingSupport, setSubmittingSupport] = useState(false);
  const { currentUser, updateProfile, selectIndustry, createSupportRequest, getMySupportRequests, getSubUsers, createSubUser, deleteSubUser, updateSubUser, createSubscriptionOrder, verifySubscriptionPayment } = useAuth();
  const userData = currentUser;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Industry (Company Profile) — one-time selection, locked once set.
  const industryChosen = hasChosenIndustry(userData);
  const industryProfile = resolveIndustryProfile(userData);
  const [selectedIndustryKey, setSelectedIndustryKey] = useState('');
  const [savingIndustry, setSavingIndustry] = useState(false);

  const saveIndustry = async () => {
    if (!selectedIndustryKey) return;
    try {
      setSavingIndustry(true);
      await selectIndustry(selectedIndustryKey);
      import('react-hot-toast').then(({ default: toast }) => toast.success('Industry saved!'));
    } catch (err) {
      console.error('Select industry error:', err);
      import('react-hot-toast').then(({ default: toast }) =>
        toast.error(err?.msg || 'Failed to save industry.')
      );
    } finally {
      setSavingIndustry(false);
    }
  };

  // Industry-change requests → super admin inbox. Only the owner can send one;
  // one pending request at a time (enforced server-side too).
  const [myRequests, setMyRequests] = useState([]);
  const [showIndustryRequest, setShowIndustryRequest] = useState(false);
  const [industryRequestForm, setIndustryRequestForm] = useState({ requestedIndustry: '', message: '' });
  const [submittingIndustryRequest, setSubmittingIndustryRequest] = useState(false);

  const refreshMyRequests = async () => {
    try {
      setMyRequests(await getMySupportRequests());
    } catch (err) {
      console.error('Fetch support requests error:', err);
    }
  };

  const pendingIndustryRequest = myRequests.find(
    (r) => r.type === 'industry_change' && r.status === 'Pending'
  );
  const industryLabelFor = (key) =>
    getSelectableProfiles().find((p) => p.key === key)?.label || key;

  const handleIndustryRequestSubmit = async (e) => {
    e.preventDefault();
    if (!industryRequestForm.requestedIndustry) {
      import('react-hot-toast').then(({ default: toast }) => toast.error('Please choose the industry you want to switch to.'));
      return;
    }
    try {
      setSubmittingIndustryRequest(true);
      await createSupportRequest({
        type: 'industry_change',
        requestedIndustry: industryRequestForm.requestedIndustry,
        message: industryRequestForm.message,
      });
      import('react-hot-toast').then(({ default: toast }) => toast.success('Request sent to support!'));
      setShowIndustryRequest(false);
      setIndustryRequestForm({ requestedIndustry: '', message: '' });
      refreshMyRequests();
    } catch (err) {
      console.error('Industry request error:', err);
      import('react-hot-toast').then(({ default: toast }) => toast.error(err?.msg || 'Failed to send request.'));
    } finally {
      setSubmittingIndustryRequest(false);
    }
  };

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    if (!supportQuery.trim()) return;
    try {
      setSubmittingSupport(true);
      await createSupportRequest({ type: 'general', message: supportQuery });
      import('react-hot-toast').then(({ default: toast }) => toast.success('Your query has been submitted successfully!'));
      setSupportQuery('');
    } catch (err) {
      console.error("Support submit error:", err);
      import('react-hot-toast').then(({ default: toast }) => toast.error(err?.msg || 'Failed to submit query.'));
    } finally {
      setSubmittingSupport(false);
    }
  };

  const [subUsers, setSubUsers] = useState([]);
  const [loadingSubUsers, setLoadingSubUsers] = useState(false);
  const [isAddingSubUser, setIsAddingSubUser] = useState(false);
  const [subUserForm, setSubUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    branch: '',
    location: '',
    subbranchName: '',
    subbranchLocation: '',
    subbranchAddress: '',
    city: '',
    state: '',
    pincode: '',
    employee_id: ''
  });
  const [savingSubUser, setSavingSubUser] = useState(false);
  const [isEditingSubUser, setIsEditingSubUser] = useState(false);
  const [editingSubUserId, setEditingSubUserId] = useState(null);
  const [additionalUserCount, setAdditionalUserCount] = useState(0);

  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    prefix: userData?.Tenant?.invoice_prefix || 'INV',
    sequence: userData?.Tenant?.next_invoice_number || 1,
    terms: userData?.Tenant?.invoice_terms ?? DEFAULT_INVOICE_TERMS
  });
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [isEditingTax, setIsEditingTax] = useState(false);
  const [taxForm, setTaxForm] = useState({
    purchaseGst: userData?.Tenant?.purchase_gst || 0,
    purchaseInclusive: userData?.Tenant?.purchase_tax_type === 'inclusive' || false,
    salesGst: userData?.Tenant?.sales_gst || 0,
    salesInclusive: userData?.Tenant?.sales_tax_type === 'inclusive' || false
  });
  const [savingTax, setSavingTax] = useState(false);

  const [isEditingPrinter, setIsEditingPrinter] = useState(false);
  const PRINTER_FORMATS = ["A4", "A5", "A4 GST Invoice", "A5 GST Invoice", "Thermal 80mm", "Thermal 58mm"];
  const [printerForm, setPrinterForm] = useState({
    format: userData?.Tenant?.printer_format || 'A4',
    autoPrint: userData?.Tenant?.print_on_finalize !== false
  });
  const [savingPrinter, setSavingPrinter] = useState(false);
  const { categories: itemCategories, save: saveItemCategories } = useItemCategories(userData);
  const categoryNames = Object.keys(itemCategories).sort((a, b) => a.localeCompare(b));

  // ── Unsaved-changes guard ──
  // Forms filled from the saved values, so "dirty" means the user actually
  // changed something, not just that an Edit button is open.
  const savedInvoiceForm = () => ({
    prefix: userData?.Tenant?.invoice_prefix || 'INV',
    sequence: userData?.Tenant?.next_invoice_number || 1,
    terms: userData?.Tenant?.invoice_terms ?? DEFAULT_INVOICE_TERMS,
  });
  const savedTaxForm = () => ({
    purchaseGst: userData?.Tenant?.purchase_gst || 0,
    purchaseInclusive: userData?.Tenant?.purchase_tax_type === 'inclusive',
    salesGst: userData?.Tenant?.sales_gst || 0,
    salesInclusive: userData?.Tenant?.sales_tax_type === 'inclusive',
  });
  const savedPrinterForm = () => ({
    format: userData?.Tenant?.printer_format || 'A4',
    autoPrint: userData?.Tenant?.print_on_finalize !== false,
  });
  // Compares loosely (as strings) so "5" typed in an input equals a saved 5.
  const differs = (a, b) => Object.keys(b).some((k) => String(a[k] ?? '') !== String(b[k] ?? ''));

  const [profileSnapshot, setProfileSnapshot] = useState({});
  const [categoriesDirty, setCategoriesDirty] = useState(false);

  const hasUnsavedChanges =
    (isEditingProfile && differs(profileForm, profileSnapshot)) ||
    (isEditingInvoice && differs(invoiceForm, savedInvoiceForm())) ||
    (isEditingTax && differs(taxForm, savedTaxForm())) ||
    (isEditingPrinter && differs(printerForm, savedPrinterForm())) ||
    (isAddingSubUser && Object.values(subUserForm).some((v) => String(v).trim() !== '')) ||
    categoriesDirty;

  const confirmDiscard = () =>
    !hasUnsavedChanges || window.confirm("You have unsaved changes. Discard them?");

  // Browser refresh / closing the tab.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedChanges]);

  // Links outside the tab bar (app sidebar, header, logo) leave the page
  // without going through selectTab. BrowserRouter has no navigation blocker,
  // so catch those clicks before React Router handles them.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const onClick = (e) => {
      const link = e.target.closest?.("a[href]");
      if (!link || link.target === "_blank") return;
      if (window.confirm("You have unsaved changes. Discard them?")) return;
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [hasUnsavedChanges]);

  const selectTab = (tab) => {
    if (tab === currentTabRef.current) return;
    if (!confirmDiscard()) return;
    setActiveTab(tab);
    setIsEditingProfile(false);
    setIsEditingInvoice(false);
    setIsEditingTax(false);
    setIsEditingPrinter(false);
    setIsAddingSubUser(false);
    // Throw away the discarded edits so the next Edit starts from saved values.
    setInvoiceForm(savedInvoiceForm());
    setTaxForm(savedTaxForm());
    setPrinterForm(savedPrinterForm());
    setIsEditingSubUser(false);
    setEditingSubUserId(null);
    setSubUserForm({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', branch: '', location: '', subbranchName: '', subbranchLocation: '', subbranchAddress: '', city: '', state: '', pincode: '', employee_id: '' });
    setCategoriesDirty(false);
    setSearchParams({ tab }, { replace: true });
  };

  const startEditProfile = () => {
    const initialProfile = {
      firstName: userData?.firstName || '',
      lastName: userData?.lastName || '',
      mobile: userData?.mobile || '',
      businessName: userData?.companyDetails?.name || userData?.businessName || '',
      // industry is intentionally not part of the generic edit form — it has
      // its own one-time selection flow below (locked once set).
      businessType: userData?.companyDetails?.type || '',
      gstin: userData?.companyDetails?.gstin || '',
      pan: userData?.companyDetails?.pan || '',
      street: userData?.address?.street || '',
      city: userData?.address?.city || '',
      state: userData?.address?.state || '',
      pincode: userData?.address?.pincode || '',
    };
    setProfileForm(initialProfile);
    setProfileSnapshot(initialProfile);
    setIsEditingProfile(true);
  };

  const cancelEditProfile = () => {
    setIsEditingProfile(false);
    setProfileForm({});
  };

  const saveProfile = async () => {
    try {
      setSavingProfile(true);
      await updateProfile(profileForm);
      setIsEditingProfile(false);
      import('react-hot-toast').then(({ default: toast }) => toast.success('Profile updated!'));
    } catch (err) {
      console.error('Update profile error:', err);
      import('react-hot-toast').then(({ default: toast }) => toast.error('Failed to save profile.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleInvoiceSave = async () => {
    try {
      setSavingInvoice(true);
      await updateProfile({
        invoice_prefix: invoiceForm.prefix,
        next_invoice_number: parseInt(invoiceForm.sequence),
        invoice_terms: invoiceForm.terms
      });
      setIsEditingInvoice(false);
    } catch (err) {
      console.error("Save invoice settings failed:", err);
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleTaxSave = async () => {
    try {
      setSavingTax(true);
      await updateProfile({
        purchase_gst: parseFloat(taxForm.purchaseGst),
        purchase_tax_type: taxForm.purchaseInclusive ? 'inclusive' : 'exclusive',
        sales_gst: parseFloat(taxForm.salesGst),
        sales_tax_type: taxForm.salesInclusive ? 'inclusive' : 'exclusive'
      });
      setIsEditingTax(false);
      import('react-hot-toast').then(({ default: toast }) => toast.success('Tax rates updated!'));
    } catch (err) {
      console.error("Save tax rates failed:", err);
      import('react-hot-toast').then(({ default: toast }) => toast.error('Failed to save tax rates.'));
    } finally {
      setSavingTax(false);
    }
  };

  const handlePrinterSave = async () => {
    try {
      setSavingPrinter(true);
      await updateProfile({
        printer_format: printerForm.format,
        print_on_finalize: printerForm.autoPrint
      });
      setIsEditingPrinter(false);
      import('react-hot-toast').then(({ default: toast }) => toast.success('Printer settings updated!'));
    } catch (err) {
      console.error("Save printer settings failed:", err);
      import('react-hot-toast').then(({ default: toast }) => toast.error('Failed to save printer settings.'));
    } finally {
      setSavingPrinter(false);
    }
  };

  const fetchSubUsers = async () => {
    try {
      setLoadingSubUsers(true);
      const data = await getSubUsers();
      setSubUsers(data);
    } catch (err) {
      console.error("Fetch sub-users error:", err);
    } finally {
      setLoadingSubUsers(false);
    }
  };

  const handleAddSubUser = async () => {
    if (!isEditingSubUser && subUserForm.password !== subUserForm.confirmPassword) {
      import('react-hot-toast').then(({ default: toast }) => toast.error('Passwords do not match!'));
      return;
    }
    try {
      setSavingSubUser(true);
      const payload = {
        firstName: subUserForm.firstName,
        lastName: subUserForm.lastName,
        email: subUserForm.email,
        branch: subUserForm.branch,
        location: subUserForm.location,
        subbranchName: subUserForm.subbranchName,
        subbranchLocation: subUserForm.subbranchLocation,
        subbranchAddress: subUserForm.subbranchAddress,
        city: subUserForm.city,
        state: subUserForm.state,
        pincode: subUserForm.pincode,
        employee_id: subUserForm.employee_id
      };

      if (!isEditingSubUser) {
        payload.password = subUserForm.password;
        await createSubUser(payload);
        import('react-hot-toast').then(({ default: toast }) => toast.success('Sub-user created!'));
      } else {
        if (subUserForm.password) payload.password = subUserForm.password;
        await updateSubUser(editingSubUserId, payload);
        import('react-hot-toast').then(({ default: toast }) => toast.success('Sub-user updated!'));
      }

      setIsAddingSubUser(false);
      setIsEditingSubUser(false);
      setEditingSubUserId(null);
      setSubUserForm({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', branch: '', location: '', subbranchName: '', subbranchLocation: '', subbranchAddress: '', city: '', state: '', pincode: '', employee_id: '' });
      fetchSubUsers();
    } catch (err) {
      console.error("Save sub-user error:", err);
      import('react-hot-toast').then(({ default: toast }) => toast.error(err.msg || 'Failed to save sub-user.'));
    } finally {
      setSavingSubUser(false);
    }
  };

  const handleEditSubUser = (user) => {
    setSubUserForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      password: '',
      confirmPassword: '',
      branch: user.branch || '',
      location: user.location || '',
      subbranchName: user.subbranchName || '',
      subbranchLocation: user.subbranchLocation || '',
      subbranchAddress: user.subbranchAddress || '',
      city: user.city || '',
      state: user.state || '',
      pincode: user.pincode || '',
      employee_id: user.employee_id || ''
    });
    setEditingSubUserId(user.id);
    setIsEditingSubUser(true);
    setIsAddingSubUser(true); // Open the form side
  };

  const handleDeleteSubUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sub-user?')) return;
    try {
      await deleteSubUser(id);
      import('react-hot-toast').then(({ default: toast }) => toast.success('Sub-user deleted!'));
      fetchSubUsers();
    } catch (err) {
      console.error("Delete sub-user error:", err);
      import('react-hot-toast').then(({ default: toast }) => toast.error('Failed to delete sub-user.'));
    }
  };

  const handleBuyAdditionalUsers = async () => {
    if (additionalUserCount <= 0) return;

    try {
      const { default: toast } = await import('react-hot-toast');
      const { loadScript } = await import('../components/Auth/loadScript');

      const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!res) {
        toast.error("Razorpay SDK failed to load.");
        return;
      }

      const orderData = await createSubscriptionOrder({
        plan: 'additional_users',
        count: additionalUserCount
      });

      const { orderId, amount, currency, keyId } = orderData;

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: "SwordNex Billing",
        description: `Additional ${additionalUserCount} Sub-Users`,
        image: "https://nexusjobs.in/logo.png",
        order_id: orderId,
        handler: async function (response) {
          try {
            await verifySubscriptionPayment({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
              plan: 'additional_users',
              count: additionalUserCount,
              amount: amount
            });
            toast.success(`${additionalUserCount} users added successfully!`);
            setAdditionalUserCount(0);
          } catch (err) {
            console.error("Verification error:", err);
            toast.error("Payment successful but verification failed.");
          }
        },
        prefill: {
          name: userData?.businessName || "",
          email: userData?.email || "",
        },
        theme: {
          color: "#f97316"
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

    } catch (err) {
      console.error("Buy additional users error:", err);
      import('react-hot-toast').then(({ default: toast }) => toast.error("Failed to initiate purchase."));
    }
  };

  const getSubUserLimit = () => {
    const tenant = userData?.Tenant || userData?.tenant;
    const rawPlan = tenant?.subscription_plan || 'Free';
    const plan = rawPlan.charAt(0).toUpperCase() + rawPlan.slice(1).toLowerCase();
    const limits = { 'Trial': 1, 'Standard': 3, 'Premium': 6, 'Free': 0, 'Basic': 2, 'Pro': 10, 'Enterprise': 50 };
    return (limits[plan] || 0) + (tenant?.additionalSubUsers || 0);
  };

  useEffect(() => {
    if (activeTab === 'team') {
      fetchSubUsers();
    }
    if (activeTab === 'profile') {
      refreshMyRequests();
    }
  }, [activeTab]);

  // ?tab=team, or the older ?section=sub_users form.
  useEffect(() => {
    const tab = searchParams.get('tab') || SECTION_TO_TAB[searchParams.get('section')];
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const pf = (key) => profileForm[key] ?? '';

  const businessName = userData?.companyDetails?.name || userData?.businessName || userData?.Tenant?.name;
  const planLabel = userData?.Tenant?.subscription_plan || 'Free';
  const isTrial = userData?.Tenant?.subscription_status === 'Trial';
  const isVerified = Boolean(userData?.gstin && userData?.pan);
  const invoicePrefix = userData?.Tenant?.invoice_prefix || 'INV';
  const salesGst = userData?.Tenant?.sales_gst || 0;
  const isOwnerOrAdmin = userData.role === 'owner' || userData.role === 'TenantAdmin';

  const daysLeft = userData?.Tenant?.subscription_expiry
    ? Math.max(0, Math.ceil((new Date(userData.Tenant.subscription_expiry) - new Date()) / 86400000))
    : null;

  const tabs = [
    { id: 'profile', label: 'Business profile', icon: Building2 },
    ...(isOwnerOrAdmin || userData.role === 'subuser' ? [{ id: 'billing', label: 'Billing & tax', icon: FileText }] : []),
    ...(isOwnerOrAdmin ? [{ id: 'products', label: 'Products', icon: Tags }] : []),
    { id: 'printing', label: 'Printing', icon: Printer },
    ...(isOwnerOrAdmin ? [{ id: 'team', label: 'Team', icon: Users }] : []),
    ...(isOwnerOrAdmin ? [{ id: 'subscription', label: 'Subscription', icon: CreditCard }] : []),
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'support', label: 'Support', icon: Mail },
  ];
  // A link to a tab this user can't see (e.g. a sub-user opening ?tab=team) falls back to the profile.
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : 'profile';
  currentTabRef.current = currentTab;
  const showSummary = TABS_WITH_SUMMARY.includes(currentTab);

  return (
    <BillingLayout>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans -m-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-bold flex-shrink-0">
              {(businessName || 'S').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-500 truncate">
                {businessName || 'Your business'} · <span className="capitalize">{userData?.role}</span> · {industryProfile.label}
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full">
            <span className="capitalize">{planLabel}</span> plan{isTrial ? ' · Trial' : ''}{daysLeft !== null ? ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : ''}
          </span>
        </div>

        {/* Tab bar */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex gap-6 overflow-x-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => selectTab(id)}
                className={`flex items-center gap-2 py-3 border-b-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${currentTab === id
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className={`space-y-6 ${showSummary ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
        {/* ── Inline Section Panel ── */}
        {currentTab === 'profile' && (
          <SettingsPanel>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Profile</h3>
                    <p className="text-xs text-gray-400">Your business &amp; account details</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditingProfile ? (
                    <button
                      onClick={startEditProfile}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors border border-emerald-200"
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={cancelEditProfile}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveProfile}
                        disabled={savingProfile}
                        className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                      >
                        {savingProfile ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Profile Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Business Info */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Business</h4>
                  <div className="space-y-3">
                    {[
                      { label: 'Business Name', key: 'businessName', value: userData?.companyDetails?.name || userData?.businessName || userData?.Tenant?.name },
                      { label: 'Business Type', key: 'businessType', value: userData?.companyDetails?.type || userData?.businessType || userData?.Tenant?.type },
                      { label: 'GSTIN', key: 'gstin', value: userData?.companyDetails?.gstin || userData?.gstin || userData?.Tenant?.gstin },
                      { label: 'PAN', key: 'pan', value: userData?.companyDetails?.pan || userData?.pan || userData?.Tenant?.pan },
                    ].map(({ label, key, value }) => (
                      <div key={label} className="flex flex-col">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</span>
                        {isEditingProfile ? (
                          <input
                            className="w-full h-9 px-3 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition-all"
                            value={pf(key)}
                            onChange={(e) => setProfileForm(f => ({ ...f, [key]: e.target.value }))}
                            onKeyDown={handleEnterToNext}
                            placeholder={label}
                          />
                        ) : (
                          <span className="text-sm text-gray-800 font-medium">{value || '—'}</span>
                        )}
                      </div>
                    ))}

                    {/* Industry — one-time selection, locked once set. Not
                        part of the generic edit form above: it has its own
                        save flow via POST /v2/auth/select-industry. */}
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Industry</span>
                      {industryChosen ? (
                        <div>
                          <span className="text-sm text-gray-800 font-medium">{industryProfile.label}</span>
                          {userData.role !== 'owner' ? (
                            <p className="text-[11px] text-gray-400 mt-0.5">Only the account owner can request an industry change.</p>
                          ) : pendingIndustryRequest ? (
                            <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Change to {industryLabelFor(pendingIndustryRequest.requestedIndustry)} requested · Pending
                            </p>
                          ) : (
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              Need a different industry?{' '}
                              <button
                                type="button"
                                onClick={() => setShowIndustryRequest(true)}
                                className="font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                              >
                                Contact support
                              </button>
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <select
                            className="w-full sm:w-auto h-9 px-3 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition-all"
                            value={selectedIndustryKey}
                            onChange={(e) => setSelectedIndustryKey(e.target.value)}
                          >
                            <option value="">Select your industry…</option>
                            {getSelectableProfiles().map((p) => (
                              <option key={p.key} value={p.key}>{p.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={saveIndustry}
                            disabled={!selectedIndustryKey || savingIndustry}
                            className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {savingIndustry ? 'Saving…' : 'Save Industry'}
                          </button>
                        </div>
                      )}
                      {!industryChosen && (
                        <p className="text-[11px] text-gray-400 mt-1">
                          This can't be changed later without contacting support — choose carefully.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Account</h4>
                  <div className="space-y-3">
                    {[
                      { label: 'First Name', key: 'firstName', value: userData?.firstName, editable: true },
                      { label: 'Last Name', key: 'lastName', value: userData?.lastName, editable: true },
                      { label: 'Email', key: null, value: userData?.email, editable: false },
                      { label: 'Mobile', key: 'mobile', value: userData?.mobile, editable: true },
                      { label: 'Role', key: null, value: userData?.role, editable: false },
                      { label: 'Plan', key: null, value: userData?.Tenant?.subscription_plan || 'N/A', editable: false },
                    ].map(({ label, key, value, editable }) => (
                      <div key={label} className="flex flex-col">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</span>
                        {isEditingProfile && editable && key ? (
                          <input
                            className="w-full h-9 px-3 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition-all"
                            value={pf(key)}
                            onChange={(e) => setProfileForm(f => ({ ...f, [key]: e.target.value }))}
                            onKeyDown={handleEnterToNext}
                            placeholder={label}
                          />
                        ) : (
                          <span className={`text-sm font-medium ${editable === false && isEditingProfile ? 'text-gray-400 italic' : 'text-gray-800'}`}>
                            {value || '—'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Address</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Street', key: 'street', value: userData?.address?.street },
                      { label: 'City', key: 'city', value: userData?.address?.city },
                      { label: 'State', key: 'state', value: userData?.address?.state },
                      { label: 'Pincode', key: 'pincode', value: userData?.address?.pincode },
                    ].map(({ label, key, value }) => (
                      <div key={label} className="flex flex-col">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</span>
                        {isEditingProfile ? (
                          <input
                            className="w-full h-9 px-3 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition-all"
                            value={pf(key)}
                            onChange={(e) => setProfileForm(f => ({ ...f, [key]: e.target.value }))}
                            onKeyDown={handleEnterToNext}
                            placeholder={label}
                          />
                        ) : (
                          <span className="text-sm text-gray-800 font-medium">{value || '—'}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </SettingsPanel>
        )}

        {/* ── Subscriptions Inline Section ── */}
        {currentTab === 'subscription' && (
          <SettingsPanel>
            <div className="p-5 md:p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">
                    Subscription
                  </h3>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Current Plan
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-extrabold text-gray-900 capitalize">
                    {userData.Tenant?.subscription_plan || "Free"}
                  </p>
                  {userData.Tenant?.subscription_status === "Trial" && (
                    <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">
                      Trial
                    </span>
                  )}
                </div>
                {userData.Tenant?.subscription_expiry && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Expires:{" "}
                    {new Date(
                      userData.Tenant.subscription_expiry
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>

              <button
                onClick={() => navigate("/pricing")}
                className="h-10 px-6 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                Upgrade Plan
              </button>
            </div>
          </SettingsPanel>
        )}

        {/* ── Security Inline Section ── */}
        {currentTab === 'security' && (
          <SettingsPanel>
            <div className="p-5 md:p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Security</h3>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50/80 border border-gray-100">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Password</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Last changed: {userData.lastPasswordChange || "Never"}
                  </p>
                </div>
                <button
                  onClick={() => navigate("/change")}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  Change
                </button>
              </div>
            </div>
          </SettingsPanel>
        )}

        {/* ── Support Inline Section ── */}
        {currentTab === 'support' && (
          <SettingsPanel>
            <div className="p-5 md:p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Support</h3>
                </div>
              </div>

              <form onSubmit={handleSupportSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">First Name</label>
                    <input
                      type="text"
                      className="w-full h-9 px-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none cursor-not-allowed"
                      value={userData?.firstName || ''}
                      readOnly
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Last Name</label>
                    <input
                      type="text"
                      className="w-full h-9 px-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none cursor-not-allowed"
                      value={userData?.lastName || ''}
                      readOnly
                    />
                  </div>
                  <div className="flex flex-col col-span-1 md:col-span-2">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Business Name</label>
                    <input
                      type="text"
                      className="w-full h-9 px-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none cursor-not-allowed"
                      value={userData?.companyDetails?.name || userData?.businessName || userData?.Tenant?.name || ''}
                      readOnly
                    />
                  </div>
                  <div className="flex flex-col col-span-1 md:col-span-2">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Email ID</label>
                    <input
                      type="email"
                      className="w-full h-9 px-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none cursor-not-allowed"
                      value={userData?.email || ''}
                      readOnly
                    />
                  </div>
                  <div className="flex flex-col col-span-1 md:col-span-2">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Queries</label>
                    <textarea
                      required
                      rows={4}
                      className="w-full p-3 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition-all resize-none"
                      placeholder="How can we help you?"
                      value={supportQuery}
                      onChange={(e) => setSupportQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={submittingSupport}
                    className="h-10 px-6 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submittingSupport ? 'Submitting...' : 'Submit Query'}
                  </button>
                </div>
              </form>
            </div>
          </SettingsPanel>
        )}

        {/* ── Sub-Users Inline Section ── */}
        {currentTab === 'team' && (
          <SettingsPanel>
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Sub-Users Management</h3>
                    <p className="text-xs text-gray-400">Manage your team members and access</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end mr-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Usage</span>
                    <span className="text-sm font-bold text-gray-900">
                      {subUsers.length} / {getSubUserLimit()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Sub-Users List */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Members</h4>
                    {!isAddingSubUser && subUsers.length < getSubUserLimit() && (
                      <button
                        onClick={() => setIsAddingSubUser(true)}
                        className="flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Member
                      </button>
                    )}
                  </div>

                  {loadingSubUsers ? (
                    <div className="py-10 flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs text-gray-400">Loading team members...</p>
                    </div>
                  ) : subUsers.length === 0 ? (
                    <div className="py-12 border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                        <Users className="w-6 h-6 text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">No sub-users added yet</p>
                      <p className="text-[11px] text-gray-400 mt-1 max-w-[200px]">Add team members to give them access to the platform</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {subUsers.map(user => (
                        <div key={user.id} className="group p-4 bg-gray-50/50 hover:bg-white rounded-xl border border-gray-100 transition-all hover:shadow-md hover:border-orange-100 relative">
                          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => handleEditSubUser(user)}
                              className="p-1.5 text-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-all"
                              title="Edit"
                            >
                              <User className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubUser(user.id)}
                              className="p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-orange-600">
                              {(user.firstName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h5 className="text-sm font-bold text-gray-800">{user.firstName} {user.lastName}</h5>
                              <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100/60">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Branch</span>
                              <span className="text-[11px] font-medium text-gray-600 truncate max-w-[60px]">{user.branch || userData?.businessName || userData?.companyDetails?.name || '—'}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Sub-Branch</span>
                              <span className="text-[11px] font-medium text-gray-600 truncate max-w-[80px]">{user.subbranchName || '—'}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Emp ID</span>
                              <span className="text-[11px] font-medium text-gray-600">{user.employee_id || '—'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Buy Additional Users Section */}
                  <div className="mt-8 p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/40 rounded-full blur-3xl group-hover:bg-white/60 transition-all"></div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div>
                        <h4 className="text-sm font-bold text-orange-800 flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          Need more users?
                        </h4>
                        <p className="text-xs text-orange-700/70 mt-1 max-w-[280px]">
                          Add more team members beyond your plan limit for just <span className="font-bold text-orange-800">₹15 / user</span>.
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center bg-white/80 rounded-lg p-1 border border-orange-200 shadow-sm">
                          <button
                            onClick={() => setAdditionalUserCount(Math.max(0, additionalUserCount - 1))}
                            className="w-8 h-8 flex items-center justify-center text-orange-600 hover:bg-orange-100 rounded-md transition-colors font-bold"
                          >
                            -
                          </button>
                          <span className="w-10 text-center text-sm font-bold text-gray-800">{additionalUserCount}</span>
                          <button
                            onClick={() => setAdditionalUserCount(additionalUserCount + 1)}
                            className="w-8 h-8 flex items-center justify-center text-orange-600 hover:bg-orange-100 rounded-md transition-colors font-bold"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-orange-700/50 uppercase">Total Cost</span>
                          <span className="text-lg font-black text-orange-800">₹{additionalUserCount * 15}</span>
                        </div>
                        <button
                          disabled={additionalUserCount === 0}
                          onClick={handleBuyAdditionalUsers}
                          className="h-10 px-6 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-200 transition-all disabled:opacity-50 disabled:shadow-none active:scale-95"
                        >
                          Buy Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Add User Form or Info */}
                <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
                  {isAddingSubUser ? (
                    <div className="animate-fadeIn">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{isEditingSubUser ? 'Edit Team Member' : 'New Team Member'}</h4>
                        <button onClick={() => setIsAddingSubUser(false)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-4">
                        {[
                          { label: 'First Name', key: 'firstName', type: 'text', placeholder: 'e.g. John' },
                          { label: 'Last Name', key: 'lastName', type: 'text', placeholder: 'e.g. Doe' },
                          { label: 'Email Address', key: 'email', type: 'email', placeholder: 'john@company.com' },
                          { label: 'Sub-Branch Name', key: 'subbranchName', type: 'text', placeholder: 'e.g. South Branch' },
                          { label: 'Sub-Branch Location', key: 'subbranchLocation', type: 'text', placeholder: 'e.g. New York' },
                          { label: 'Sub-Branch Address', key: 'subbranchAddress', type: 'text', placeholder: 'e.g. 123 Main St' },
                          { label: 'City', key: 'city', type: 'text', placeholder: 'e.g. New York' },
                          { label: 'State', key: 'state', type: 'text', placeholder: 'e.g. NY' },
                          { label: 'Pincode', key: 'pincode', type: 'text', placeholder: 'e.g. 10001' },
                          { label: 'Employee ID', key: 'employee_id', type: 'text', placeholder: 'Emp-001' },
                          { label: 'Password', key: 'password', type: 'password', placeholder: 'Set password' },
                          { label: 'Confirm Password', key: 'confirmPassword', type: 'password', placeholder: 'Repeat password' },
                        ].map(field => (
                          <div key={field.key}>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 ml-1">
                              {field.label}
                            </label>
                            <input
                              type={field.type}
                              value={subUserForm[field.key]}
                              onChange={(e) => setSubUserForm(f => ({ ...f, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                              className="w-full h-10 px-3.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-100 focus:border-orange-400 focus:outline-none transition-all"
                              onKeyDown={handleEnterToNext}
                            />
                          </div>
                        ))}
                        <button
                          onClick={handleAddSubUser}
                          disabled={savingSubUser}
                          className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-100 transition-all mt-6 active:scale-95 disabled:opacity-60"
                        >
                          {savingSubUser ? (isEditingSubUser ? 'Updating...' : 'Creating...') : (isEditingSubUser ? 'Update Account' : 'Create Account')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col justify-center items-center text-center py-10 opacity-60">
                      <div className="w-16 h-16 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center mb-4">
                        <Shield className="w-8 h-8 text-orange-200" />
                      </div>
                      <h5 className="text-sm font-bold text-gray-700">Access Control</h5>
                      <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                        Sub-users sign in on the <span className="font-bold text-orange-600">Team sign in</span> page (login page → “Team member? Sign in here”) with their email and the password you set.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SettingsPanel>
        )}

        {/* ── Invoice Settings Inline Section ── */}
        {currentTab === 'billing' && isOwnerOrAdmin && (
          <SettingsPanel>
            <div className="p-5 md:p-6">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-cyan-600" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-900">
                    Invoice Settings
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditingInvoice ? (
                    <button
                      onClick={() => setIsEditingInvoice(true)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors border border-emerald-200"
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => { setIsEditingInvoice(false); setInvoiceForm(savedInvoiceForm()); }}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleInvoiceSave}
                        disabled={savingInvoice}
                        className="text-xs font-semibold text-white bg-emerald-600 px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60"
                      >
                        {savingInvoice ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Invoice Prefix
                  </label>
                  {isEditingInvoice ? (
                    <input
                      className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all uppercase text-gray-900"
                      value={invoiceForm.prefix}
                      placeholder="INV"
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          prefix: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <div className="h-10 flex items-center px-3 text-sm rounded-lg bg-gray-50 border border-gray-100 uppercase">
                      <span className="text-gray-800 font-medium">
                        {userData?.Tenant?.invoice_prefix || "INV"}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Next Invoice Number
                  </label>
                  {isEditingInvoice ? (
                    <input
                      type="number"
                      className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all text-gray-900"
                      value={invoiceForm.sequence}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          sequence: e.target.value,
                        })
                      }
                      onKeyDown={handleEnterToNext}
                    />
                  ) : (
                    <div className="h-10 flex items-center px-3 text-sm rounded-lg bg-gray-50 border border-gray-100">
                      <span className="text-gray-800 font-medium">
                        {userData?.Tenant?.next_invoice_number || 1}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Each saved bill takes the next number automatically, e.g. <span className="font-medium text-gray-700">{formatInvoiceNumber(isEditingInvoice ? invoiceForm.prefix : userData?.Tenant?.invoice_prefix, isEditingInvoice ? invoiceForm.sequence : (userData?.Tenant?.next_invoice_number || 1))}</span>. Setting the number lower than one already used will repeat invoice numbers.
              </p>

              <div className="mt-5">
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Terms on invoice
                </label>
                {isEditingInvoice ? (
                  <textarea
                    rows={4}
                    maxLength={1000}
                    className="w-full p-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all text-gray-900 resize-y"
                    value={invoiceForm.terms}
                    placeholder="One term per line"
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, terms: e.target.value })}
                  />
                ) : (
                  <div className="px-3 py-2.5 text-sm rounded-lg bg-gray-50 border border-gray-100 whitespace-pre-line text-gray-800">
                    {(userData?.Tenant?.invoice_terms ?? DEFAULT_INVOICE_TERMS) || <span className="text-gray-400">No terms printed</span>}
                  </div>
                )}
                <p className="mt-1.5 text-xs text-gray-500">Printed at the bottom of A4 / A5 GST invoices, one term per line. Leave empty to print none.</p>
              </div>
            </div>
          </SettingsPanel>
        )}

        {/* ── Tax Rates Inline Section ── */}
        {currentTab === 'billing' && (userData.role === 'owner' || userData.role === 'subuser') && (
          <SettingsPanel>
            <div className="p-5 md:p-6">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-orange-600" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-900">
                    Tax Rates
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditingTax ? (
                    <button
                      onClick={() => setIsEditingTax(true)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors border border-emerald-200"
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => { setIsEditingTax(false); setTaxForm(savedTaxForm()); }}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleTaxSave}
                        disabled={savingTax}
                        className="text-xs font-semibold text-white bg-emerald-600 px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60"
                      >
                        {savingTax ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Purchase Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Purchase Settings</h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Purchase GST %
                      </label>
                      {isEditingTax ? (
                        <input
                          type="number"
                          className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all text-gray-900"
                          value={taxForm.purchaseGst}
                          onChange={(e) => setTaxForm({ ...taxForm, purchaseGst: e.target.value })}
                          onKeyDown={handleEnterToNext}
                          placeholder="0"
                        />
                      ) : (
                        <div className="h-10 flex items-center px-3 text-sm rounded-lg bg-gray-50 border border-gray-100">
                          <span className="text-gray-800 font-medium">{userData?.Tenant?.purchase_gst || 0}%</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <span className="text-xs font-semibold text-gray-600">Is Inclusive?</span>
                      {isEditingTax ? (
                        <button
                          onClick={() => setTaxForm({ ...taxForm, purchaseInclusive: !taxForm.purchaseInclusive })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${taxForm.purchaseInclusive ? 'bg-emerald-600' : 'bg-gray-200'
                            }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${taxForm.purchaseInclusive ? 'translate-x-6' : 'translate-x-1'
                              }`}
                          />
                        </button>
                      ) : (
                        <span className={`text-xs font-bold ${userData?.Tenant?.purchase_tax_type === 'inclusive' ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {userData?.Tenant?.purchase_tax_type === 'inclusive' ? 'YES' : 'NO'}
                        </span>
                      )}
                    </div>

                  </div>

                  {/* Purchase Preview */}
                  <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                    <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-2">Sample Calculation (₹1000)</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Base Price:</span>
                        <span className="font-medium text-gray-700">
                          ₹{taxForm.purchaseInclusive
                            ? (1000 / (1 + (parseFloat(taxForm.purchaseGst) || 0) / 100)).toFixed(2)
                            : "1000.00"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">GST Amount ({taxForm.purchaseGst}%):</span>
                        <span className="font-medium text-gray-700">
                          ₹{taxForm.purchaseInclusive
                            ? (1000 - (1000 / (1 + (parseFloat(taxForm.purchaseGst) || 0) / 100))).toFixed(2)
                            : (1000 * (parseFloat(taxForm.purchaseGst) || 0) / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-emerald-200 mt-1">
                        <span className="font-bold text-gray-700">Grand Total:</span>
                        <span className="font-bold text-emerald-600">
                          ₹{taxForm.purchaseInclusive
                            ? "1000.00"
                            : (1000 + (1000 * (parseFloat(taxForm.purchaseGst) || 0) / 100)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sales Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sales Settings</h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Sale GST %
                      </label>
                      {isEditingTax ? (
                        <input
                          type="number"
                          className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all text-gray-900"
                          value={taxForm.salesGst}
                          onChange={(e) => setTaxForm({ ...taxForm, salesGst: e.target.value })}
                          onKeyDown={handleEnterToNext}
                          placeholder="0"
                        />
                      ) : (
                        <div className="h-10 flex items-center px-3 text-sm rounded-lg bg-gray-50 border border-gray-100">
                          <span className="text-gray-800 font-medium">{userData?.Tenant?.sales_gst || 0}%</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <span className="text-xs font-semibold text-gray-600">Is Inclusive?</span>
                      {isEditingTax ? (
                        <button
                          onClick={() => setTaxForm({ ...taxForm, salesInclusive: !taxForm.salesInclusive })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${taxForm.salesInclusive ? 'bg-emerald-600' : 'bg-gray-200'
                            }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${taxForm.salesInclusive ? 'translate-x-6' : 'translate-x-1'
                              }`}
                          />
                        </button>
                      ) : (
                        <span className={`text-xs font-bold ${userData?.Tenant?.sales_tax_type === 'inclusive' ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {userData?.Tenant?.sales_tax_type === 'inclusive' ? 'YES' : 'NO'}
                        </span>
                      )}
                    </div>

                    {/* Sales Preview */}
                    <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                      <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-2">Sample Calculation (₹1000)</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Base Price:</span>
                          <span className="font-medium text-gray-700">
                            ₹{taxForm.salesInclusive
                              ? (1000 / (1 + (parseFloat(taxForm.salesGst) || 0) / 100)).toFixed(2)
                              : "1000.00"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">GST Amount ({taxForm.salesGst}%):</span>
                          <span className="font-medium text-gray-700">
                            ₹{taxForm.salesInclusive
                              ? (1000 - (1000 / (1 + (parseFloat(taxForm.salesGst) || 0) / 100))).toFixed(2)
                              : (1000 * (parseFloat(taxForm.salesGst) || 0) / 100).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-emerald-200 mt-1">
                          <span className="font-bold text-gray-700">Total Amount:</span>
                          <span className="font-bold text-emerald-600">
                            ₹{taxForm.salesInclusive
                              ? "1000.00"
                              : (1000 + (1000 * (parseFloat(taxForm.salesGst) || 0) / 100)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SettingsPanel>
        )}

        {/* ── Printer Settings Inline Section ── */}
        {currentTab === 'printing' && (
          <SettingsPanel>
            <div className="p-5 md:p-6">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                    <Printer className="w-4 h-4 text-orange-600" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-900">
                    Printer Settings
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditingPrinter ? (
                    <button
                      onClick={() => setIsEditingPrinter(true)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors border border-emerald-200"
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => { setIsEditingPrinter(false); setPrinterForm(savedPrinterForm()); }}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handlePrinterSave}
                        disabled={savingPrinter}
                        className="text-xs font-semibold text-white bg-emerald-600 px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60"
                      >
                        {savingPrinter ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Default Receipt Format
                  </label>
                  {isEditingPrinter ? (
                    <select
                      className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all text-gray-900"
                      value={printerForm.format}
                      onChange={(e) => setPrinterForm({ ...printerForm, format: e.target.value })}
                      onKeyDown={handleEnterToNext}
                    >
                      {PRINTER_FORMATS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="h-10 flex items-center px-3 text-sm rounded-lg bg-gray-50 border border-gray-100">
                      <span className="text-gray-800 font-medium">{userData?.Tenant?.printer_format || 'A4'}</span>
                    </div>
                  )}
                  <p className="mt-1.5 text-xs text-gray-500">
                    Every bill opens in this format. You can still switch it for a single bill in the receipt preview.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between p-4 rounded-xl bg-orange-50 border border-orange-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white border border-orange-100 flex items-center justify-center">
                    <Printer className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Print automatically on Finalize</h4>
                    <p className="text-xs text-gray-500">Opens the print dialog when a sale is finalized. Turn off to only save the bill; you can still press Print in the receipt preview or reprint from Records.</p>
                  </div>
                </div>
                {isEditingPrinter ? (
                  <button
                    onClick={() => setPrinterForm({ ...printerForm, autoPrint: !printerForm.autoPrint })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${printerForm.autoPrint ? 'bg-orange-600' : 'bg-gray-200'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${printerForm.autoPrint ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                ) : (
                  <span className={`text-xs font-bold ${userData?.Tenant?.print_on_finalize !== false ? 'text-orange-600' : 'text-gray-400'}`}>
                    {userData?.Tenant?.print_on_finalize !== false ? 'ON' : 'OFF'}
                  </span>
                )}
              </div>
            </div>
          </SettingsPanel>
        )}

        {/* ── Categories & Products ── */}
        {currentTab === 'products' && isOwnerOrAdmin && (
          <SettingsPanel>
            <ItemCategoriesManager
              categories={itemCategories}
              onSave={saveItemCategories}
              profileKey={industryProfile.key}
              onDirtyChange={setCategoriesDirty}
            />
          </SettingsPanel>
        )}

          </div>

          {/* Summary column */}
          {showSummary && (
            <aside className="space-y-6">
              <SettingsPanel>
                <div className="p-5">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Current plan</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-extrabold text-gray-900 capitalize">{planLabel}</p>
                    {isTrial && (
                      <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md">Trial</span>
                    )}
                  </div>
                  {userData.Tenant?.subscription_expiry && (
                    <p className="text-xs text-gray-500 mt-1">
                      {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : 'Expired'} · ends {new Date(userData.Tenant.subscription_expiry).toLocaleDateString()}
                    </p>
                  )}
                  {isOwnerOrAdmin && (
                    <button
                      onClick={() => navigate('/pricing')}
                      className="mt-4 w-full h-9 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                    >
                      Upgrade plan
                    </button>
                  )}
                </div>
              </SettingsPanel>

              <SettingsPanel>
                <div className="p-5">
                  <p className="text-sm font-semibold text-gray-900 mb-3">Account status</p>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Verification</span>
                      <span className={`font-semibold px-2 py-0.5 rounded-md ${isVerified ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
                        {isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                    {userData.createdAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Created</span>
                        <span className="font-medium text-gray-700">{new Date(userData.createdAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    {userData.lastLogin && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last login</span>
                        <span className="font-medium text-gray-700">{new Date(userData.lastLogin).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  {!isVerified && (
                    <p className="text-[11px] text-gray-400 mt-3">Add your GSTIN and PAN in the business profile to get verified.</p>
                  )}
                </div>
              </SettingsPanel>

              {currentTab !== 'support' && (
                <SettingsPanel>
                  <button onClick={() => selectTab('support')} className="w-full p-5 flex items-center justify-between text-left group">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Need help?</p>
                      <p className="text-xs text-gray-500">Send a message to our support team</p>
                    </div>
                    <ArrowLeft className="w-4 h-4 rotate-180 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </SettingsPanel>
              )}
            </aside>
          )}
        </div>

        {/* ── Industry Change Request ── */}
        {showIndustryRequest && (
          <div className="fixed inset-0 bg-black/60 flex justify-center items-center p-4 z-[60] animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleIndustryRequestSubmit} className="p-6">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Request an Industry Change</h3>
                      <p className="text-xs text-gray-400">Sent to the SwordNex team for approval</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowIndustryRequest(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Current Industry</label>
                    <div className="h-9 flex items-center px-3 text-sm rounded-lg bg-gray-50 border border-gray-100 text-gray-700 font-medium">
                      {industryProfile.label}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                      Switch To <span className="text-red-400">*</span>
                    </label>
                    <select
                      required
                      className="w-full h-9 px-3 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition-all"
                      value={industryRequestForm.requestedIndustry}
                      onChange={(e) => setIndustryRequestForm((f) => ({ ...f, requestedIndustry: e.target.value }))}
                    >
                      <option value="">Select the industry you want…</option>
                      {getSelectableProfiles()
                        .filter((p) => p.key !== industryProfile.key)
                        .map((p) => (
                          <option key={p.key} value={p.key}>{p.label}</option>
                        ))}
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                      Message <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      maxLength={2000}
                      className="w-full p-3 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition-all resize-none"
                      placeholder="Tell us why you'd like to change your industry…"
                      value={industryRequestForm.message}
                      onChange={(e) => setIndustryRequestForm((f) => ({ ...f, message: e.target.value }))}
                    />
                  </div>

                  <p className="text-[11px] text-gray-400 leading-relaxed bg-amber-50/60 border border-amber-100 rounded-lg p-3">
                    Once approved, your sidebar and screens switch to the new industry. Existing records stay in your account.
                    You may need to sign in again to see the change.
                  </p>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowIndustryRequest(false)}
                    className="h-10 px-5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingIndustryRequest}
                    className="h-10 px-6 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submittingIndustryRequest ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </BillingLayout>
  );
};

export default Settings;