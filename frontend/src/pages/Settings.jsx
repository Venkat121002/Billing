
import React, { useState, useEffect } from 'react';
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
  Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleEnterToNext } from '../utils/formUtils';
import BillingLayout from '../Layout/BillingLayout/AdminLayout';



const Settings = () => {
  const [activeSection, setActiveSection] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [supportQuery, setSupportQuery] = useState('');
  const [submittingSupport, setSubmittingSupport] = useState(false);
  const { currentUser, updateProfile, getSubUsers, createSubUser, deleteSubUser, updateSubUser, createSubscriptionOrder, verifySubscriptionPayment } = useAuth();
  const userData = currentUser;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    if (!supportQuery.trim()) return;
    try {
      setSubmittingSupport(true);
      // Simulate API call for submitting support query
      await new Promise(resolve => setTimeout(resolve, 1000));
      import('react-hot-toast').then(({ default: toast }) => toast.success('Your query has been submitted successfully!'));
      setSupportQuery('');
    } catch (err) {
      console.error("Support submit error:", err);
      import('react-hot-toast').then(({ default: toast }) => toast.error('Failed to submit query.'));
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
    sequence: userData?.Tenant?.next_invoice_number || 1
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
  const [printerForm, setPrinterForm] = useState({
    configs: userData?.Tenant?.printer_configs || [
      {
        category: userData?.Tenant?.printer_category || 'Mobile',
        format: userData?.Tenant?.printer_format || 'A4'
      }
    ],
    autoPrint: userData?.Tenant?.printer_auto_print || false
  });
  const [savingPrinter, setSavingPrinter] = useState(false);

  const toggleSection = (section) => {
    setActiveSection(prev => prev === section ? null : section);
    setIsEditingProfile(false);
    setIsEditingInvoice(false);
    setIsEditingTax(false);
    setIsEditingPrinter(false);
  };

  const startEditProfile = () => {
    setProfileForm({
      firstName: userData?.firstName || '',
      lastName: userData?.lastName || '',
      mobile: userData?.mobile || '',
      businessName: userData?.companyDetails?.name || userData?.businessName || '',
      industry: userData?.companyDetails?.industry || '',
      businessType: userData?.companyDetails?.type || '',
      gstin: userData?.companyDetails?.gstin || '',
      pan: userData?.companyDetails?.pan || '',
      street: userData?.address?.street || '',
      city: userData?.address?.city || '',
      state: userData?.address?.state || '',
      pincode: userData?.address?.pincode || '',
    });
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
        next_invoice_number: parseInt(invoiceForm.sequence)
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

  const addPrinterConfig = () => {
    setPrinterForm(prev => ({
      ...prev,
      configs: [...prev.configs, { category: 'Mobile', format: 'A4' }]
    }));
  };

  const removePrinterConfig = (index) => {
    if (printerForm.configs.length <= 1) return;
    setPrinterForm(prev => ({
      ...prev,
      configs: prev.configs.filter((_, i) => i !== index)
    }));
  };

  const handlePrinterSave = async () => {
    try {
      setSavingPrinter(true);
      await updateProfile({
        printer_configs: printerForm.configs,
        printer_auto_print: printerForm.autoPrint
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
    if (activeSection === 'sub_users') {
      fetchSubUsers();
    }
  }, [activeSection]);

  useEffect(() => {
    const section = searchParams.get('section');
    if (section) {
      setActiveSection(section);
      if (section === 'sub_users') {
        fetchSubUsers();
      }
    }
  }, [searchParams]);

  const pf = (key) => profileForm[key] ?? '';
  return (
    <BillingLayout hideSidebar={true}>
      <div className="min-h-screen bg-gray-50 p-8 font-sans -m-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6 group"
        >
          <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center group-hover:bg-gray-50 shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium">Back</span>
        </button>
        {/* Organisation Settings Section */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Organisation Settings</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Organisation Card */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Organisation</h3>
              </div>
              <ul className="space-y-3">

                <li>
                  <button
                    onClick={() => toggleSection('profile')}
                    className={`flex items-center justify-between w-full text-sm transition-colors ${activeSection === 'profile'
                      ? 'text-emerald-600 font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Profile
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${activeSection === 'profile' ? 'rotate-90 text-emerald-500' : ''
                        }`}
                    />
                  </button>
                </li>
                {(userData.role === 'owner' || userData.role === 'TenantAdmin') && (
                  <li>
                    <button
                      onClick={() => toggleSection('subscriptions')}
                      className={`flex items-center justify-between w-full text-sm transition-colors ${activeSection === 'subscriptions'
                        ? 'text-emerald-600 font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                      Subscriptions
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${activeSection === 'subscriptions' ? 'rotate-90 text-emerald-500' : ''
                          }`}
                      />
                    </button>
                  </li>
                )}
                <li>
                  <button
                    onClick={() => toggleSection('support')}
                    className={`flex items-center justify-between w-full text-sm transition-colors ${activeSection === 'support'
                      ? 'text-emerald-600 font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Support
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${activeSection === 'support' ? 'rotate-90 text-emerald-500' : ''
                        }`}
                    />
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => toggleSection('account_stats')}
                    className={`flex items-center justify-between w-full text-sm transition-colors ${activeSection === 'account_stats'
                      ? 'text-emerald-600 font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Account Status
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${activeSection === 'account_stats' ? 'rotate-90 text-emerald-500' : ''
                        }`}
                    />
                  </button>
                </li>
                {(userData.role === 'owner' || userData.role === 'TenantAdmin') && (
                  <li>
                    <button
                      onClick={() => toggleSection('invoice')}
                      className={`flex items-center justify-between w-full text-sm transition-colors ${activeSection === 'invoice'
                        ? 'text-emerald-600 font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                      Invoice
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${activeSection === 'invoice' ? 'rotate-90 text-emerald-500' : ''
                          }`}
                      />
                    </button>
                  </li>
                )}
              </ul>
            </div>

            {/* Users and Roles Card */}
            {/* <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Users and Roles</h3>
            </div>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Users
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Roles
                </a>
              </li>
       
              <li className="mt-3">
                <div className="bg-rose-50 rounded-lg p-3 -mx-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-rose-500" />
                    <span className="text-sm font-medium text-rose-600">Taxes</span>
                  </div>
                  <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors pl-6 block">
                    Tax Details
                  </a>
                </div>
              </li>
            </ul>
          </div> */}

            {/* Security Card */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Security</h3>
              </div>
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={() => toggleSection('security')}
                    className={`flex items-center justify-between w-full text-sm transition-colors ${activeSection === 'security'
                      ? 'text-red-600 font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Security Settings
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${activeSection === 'security' ? 'rotate-90 text-red-500' : ''
                        }`}
                    />
                  </button>
                </li>
              </ul>
            </div>

            {/* Configuration Card */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Settings2 className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Configuration</h3>
              </div>
              <ul className="space-y-3">
                {(userData.role === 'owner' || userData.role === 'subuser') && (
                  <li>
                    <button
                      onClick={() => toggleSection('tax_rates')}
                      className={`flex items-center justify-between w-full text-sm transition-colors ${activeSection === 'tax_rates'
                        ? 'text-orange-600 font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                      Tax Rates
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${activeSection === 'tax_rates' ? 'rotate-90 text-orange-500' : ''
                          }`}
                      />
                    </button>
                  </li>
                )}
                
                  <>
                    <li>
                      <button
                        onClick={() => toggleSection('printer')}
                        className={`flex items-center justify-between w-full text-sm transition-colors ${activeSection === 'printer'
                          ? 'text-orange-600 font-semibold'
                          : 'text-gray-600 hover:text-gray-900'
                          }`}
                      >
                        Printer
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${activeSection === 'printer' ? 'rotate-90 text-orange-500' : ''
                            }`}
                        />
                      </button>
                    </li>
                    {(userData.role === 'owner' || userData.role === 'TenantAdmin') && (
                    <li>
                      <button
                        onClick={() => toggleSection('sub_users')}
                        className={`flex items-center justify-between w-full text-sm transition-colors ${activeSection === 'sub_users'
                          ? 'text-orange-600 font-semibold'
                          : 'text-gray-600 hover:text-gray-900'
                          }`}
                      >
                        Sub-Users
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${activeSection === 'sub_users' ? 'rotate-90 text-orange-500' : ''
                            }`}
                        />
                      </button>
                    </li>
                     )}
                  </>
               
              </ul>
            </div>

            {/* Setup & Configurations Card */}
            {/* <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Settings2 className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Setup & Configurations</h3>
            </div>
            <ul className="space-y-3">
              {['Pay Schedule', 'Statutory Components', 'Salary Components', 'Employee Portal', 'Claims and Declarations'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div> */}

            {/* Customisations Card */}
            {/* <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                <Palette className="w-5 h-5 text-teal-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Customisations</h3>
            </div>
            <ul className="space-y-3">
              {['Email Templates', 'Sender Email Preferences', 'Salary Templates', 'PDF Templates', 'Reporting Tags'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div> */}
          </div>
        </section>

        {/* ── Inline Section Panel ── */}
        {activeSection === 'profile' && (
          <section className="mb-10 animate-fadeIn">
            <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-6">
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
                  <button
                    onClick={() => { setActiveSection(null); setIsEditingProfile(false); }}
                    className="text-gray-400 hover:text-gray-600 transition-colors ml-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
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
                      { label: 'Industry', key: 'industry', value: userData?.companyDetails?.industry || userData?.Tenant?.industry },
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
          </section>
        )}

        {/* ── Subscriptions Inline Section ── */}
        {activeSection === 'subscriptions' && (
          <section className="mb-10 animate-fadeIn">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">
                    Subscription
                  </h3>
                </div>
                <button
                  onClick={() => setActiveSection(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
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
          </section>
        )}

        {/* ── Security Inline Section ── */}
        {activeSection === 'security' && (
          <section className="mb-10 animate-fadeIn">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Security</h3>
                </div>
                <button
                  onClick={() => setActiveSection(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
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
          </section>
        )}

        {/* ── Support Inline Section ── */}
        {activeSection === 'support' && (
          <section className="mb-10 animate-fadeIn">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Support</h3>
                </div>
                <button
                  onClick={() => setActiveSection(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
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
          </section>
        )}

        {/* ── Account Status Inline Section ── */}
        {activeSection === 'account_stats' && (
          <section className="mb-10 animate-fadeIn">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Account Status</h3>
                </div>
                <button
                  onClick={() => setActiveSection(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  {
                    label: "Verification",
                    value: userData.gstin && userData.pan ? "Verified" : "Pending",
                    color: userData.gstin && userData.pan ? "text-emerald-600" : "text-amber-600",
                    bg: userData.gstin && userData.pan ? "bg-emerald-50" : "bg-amber-50",
                  },
                  {
                    label: "Created",
                    value: new Date(userData.createdAt).toLocaleDateString(),
                    color: "text-gray-700",
                  },
                  {
                    label: "Last Login",
                    value: new Date(userData.lastLogin).toLocaleString(),
                    color: "text-gray-700",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-xs font-medium text-gray-500">
                      {item.label}
                    </span>
                    <span
                      className={`text-xs font-semibold ${item.color} ${item.bg
                        ? `${item.bg} px-2 py-0.5 rounded-md`
                        : ""
                        }`}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Sub-Users Inline Section ── */}
        {activeSection === 'sub_users' && (
          <section className="mb-10 animate-fadeIn">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 overflow-hidden">
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
                  <button
                    onClick={() => { setActiveSection(null); setIsAddingSubUser(false); }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
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
                        Sub-users can log in via the <span className="font-bold text-orange-600">Team</span> tab on the login page using their email and the password you set.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Invoice Settings Inline Section ── */}
        {activeSection === 'invoice' && (
          <section className="mb-10 animate-fadeIn">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6 hover:shadow-sm transition-shadow">
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
                        onClick={() => setIsEditingInvoice(false)}
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
                  <button
                    onClick={() => { setActiveSection(null); setIsEditingInvoice(false); }}
                    className="text-gray-400 hover:text-gray-600 transition-colors ml-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
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
            </div>
          </section>
        )}

        {/* ── Tax Rates Inline Section ── */}
        {activeSection === 'tax_rates' && (
          <section className="mb-10 animate-fadeIn">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6 hover:shadow-sm transition-shadow">
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
                        onClick={() => setIsEditingTax(false)}
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
                  <button
                    onClick={() => { setActiveSection(null); setIsEditingTax(false); }}
                    className="text-gray-400 hover:text-gray-600 transition-colors ml-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
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
          </section >
        )}

        {/* ── Printer Settings Inline Section ── */}
        {activeSection === 'printer' && (
          <section className="mb-10 animate-fadeIn">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6 hover:shadow-sm transition-shadow">
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
                        onClick={() => setIsEditingPrinter(false)}
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
                  <button
                    onClick={() => { setActiveSection(null); setIsEditingPrinter(false); }}
                    className="text-gray-400 hover:text-gray-600 transition-colors ml-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {printerForm.configs.map((config, index) => (
                  <div key={index} className="relative group">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                          Category {printerForm.configs.length > 1 && `#${index + 1}`}
                        </label>
                        {isEditingPrinter  && userData.Tenant.industry ==="pharmacy" ?(

                          <select
                            className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all text-gray-900"
                            value={config.category}
                            onChange={(e) => {
                              const newConfigs = [...printerForm.configs];
                              newConfigs[index].category = e.target.value;
                              setPrinterForm({ ...printerForm, configs: newConfigs });
                            }}
                            onKeyDown={handleEnterToNext}
                          >

                            {[  "Tablets", "Syrups","Capsules","Injections","Topical","Vitamins & Supplements","Pain Relief","Antibiotics","Antacids","Cough & Cold","First Aid", "Medical Devices","Baby Care","Personal Hygiene","Ayurvedic & Herbal" ].map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}

                            
                          </select>
                         
                        ) :
                      
                        isEditingPrinter  && userData.Tenant.industry ==="clothing" ?(

                          <select
                            className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all text-gray-900"
                            value={config.category}
                            onChange={(e) => {
                              const newConfigs = [...printerForm.configs];
                              newConfigs[index].category = e.target.value;
                              setPrinterForm({ ...printerForm, configs: newConfigs });
                            }}
                            onKeyDown={handleEnterToNext}
                          >

                            {["Men", "Women", "Kids", "Accessories","Winter Wear","Sports Wear"].map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}

                            
                          </select>
                        ) :
                        isEditingPrinter  && userData.Tenant.industry ==="grocery_store" ?(

                          <select
                            className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all text-gray-900"
                            value={config.category}
                            onChange={(e) => {
                              const newConfigs = [...printerForm.configs];
                              newConfigs[index].category = e.target.value;
                              setPrinterForm({ ...printerForm, configs: newConfigs });
                            }}
                            onKeyDown={handleEnterToNext}
                          >

                            {["Food & Staples", "Snacks & Packaged Foods", "Beverages", "Spices & Seasonings", "Oils & Fats", "Dairy Products","Bakery Items", "Ready-to-Eat / Packaged","Household Items","Personal Care","Fruits & Vegetables","Meat & Eggs"].map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}

                            
                          </select>
                        ) :
                        isEditingPrinter  && userData.Tenant.industry ==="software_development" ?(

                          <select
                            className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all text-gray-900"
                            value={config.category}
                            onChange={(e) => {
                              const newConfigs = [...printerForm.configs];
                              newConfigs[index].category = e.target.value;
                              setPrinterForm({ ...printerForm, configs: newConfigs });
                            }}
                            onKeyDown={handleEnterToNext}
                          >

                            {["Web Development", "Mobile App", "UI/UX Design", "Devops", "Q/A Testing", "Maintanence","Consulting"].map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}

                            
                          </select>
                        ) :
                        isEditingPrinter  && userData.companyDetails.industry ==="mobile_shop" ?(

                          <select
                            className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all text-gray-900"
                            value={config.category}
                            onChange={(e) => {
                              const newConfigs = [...printerForm.configs];
                              newConfigs[index].category = e.target.value;
                              setPrinterForm({ ...printerForm, configs: newConfigs });
                            }}
                            onKeyDown={handleEnterToNext}
                          >

                            {["Mobile", "Bluetooth", "Charger", "Headset", "Cable", "Academy"].map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}

                            
                          </select>
                        ) :
                        isEditingPrinter  && userData.Tenant.industry ==="academy" ?(

                          <select
                            className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all text-gray-900"
                            value={config.category}
                            onChange={(e) => {
                              const newConfigs = [...printerForm.configs];
                              newConfigs[index].category = e.target.value;
                              setPrinterForm({ ...printerForm, configs: newConfigs });
                            }}
                            onKeyDown={handleEnterToNext}
                          >

                            {["IT", "Spoken English", "Design", "Bussiness", "Skill Development"].map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}

                            
                          </select>
                        ) :
                        
                        
                        (
                          <div className="h-10 flex items-center px-3 text-sm rounded-lg bg-gray-50 border border-gray-100">
                            <span className="text-gray-800 font-medium">{config.category}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                            Printer Format
                          </label>
                          {isEditingPrinter ? (
                            <select
                              className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all text-gray-900"
                              value={config.format}
                              onChange={(e) => {
                                const newConfigs = [...printerForm.configs];
                                newConfigs[index].format = e.target.value;
                                setPrinterForm({ ...printerForm, configs: newConfigs });
                              }}
                              onKeyDown={handleEnterToNext}
                            >
                              {["A4", "A5", "A4 GST Invoice", "A5 GST Invoice", "Thermal 80mm", "Thermal 58mm"].map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="h-10 flex items-center px-3 text-sm rounded-lg bg-gray-50 border border-gray-100">
                              <span className="text-gray-800 font-medium">{config.format}</span>
                            </div>
                          )}
                        </div>

                        {isEditingPrinter && printerForm.configs.length > 1 && (
                          <button
                            onClick={() => removePrinterConfig(index)}
                            className="mb-0.5 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove this configuration"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isEditingPrinter && (
                  <button
                    onClick={addPrinterConfig}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-emerald-600 border-2 border-dashed border-emerald-100 rounded-xl hover:border-emerald-200 hover:bg-emerald-50 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Another Configuration
                  </button>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between p-4 rounded-xl bg-orange-50 border border-orange-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white border border-orange-100 flex items-center justify-center">
                    <Printer className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Auto-Print on Sale</h4>
                    <p className="text-xs text-gray-500">Automatically trigger print dialog after completing a sale</p>
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
                  <span className={`text-xs font-bold ${userData?.Tenant?.printer_auto_print ? 'text-orange-600' : 'text-gray-400'}`}>
                    {userData?.Tenant?.printer_auto_print ? 'ENABLED' : 'DISABLED'}
                  </span>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </BillingLayout>
  );
};

export default Settings;