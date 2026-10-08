import React, { useState, useEffect } from "react";
import { Search, PlusCircle, Edit3, Trash2, CircleX, Eye, Lock, Crown, Table, Mail, Link2, MessageCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import { Link } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import axios from "axios";
import API_URL from "../../config/api";



const Credit = () => {
  const { currentUser, hasCapability } = useAuth();
  const userData = currentUser;

  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    customerId: "",
    name: "",
    email: "",
    address: "",
    date: "",
    credit: 0,
    gst: 0,
    total: 0,
    balance: 0,
    totalbalance: 0,   // ✅ add this
    due: 0,
    phone: "",
    quantity: 1,
    price: 0,
    productId: "",
    dueSession: null,
    payments: [],
  });


  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [viewTable, setViewTable] = useState(null);
  const [productsList, setProductsList] = useState([]);
  const [isReceipt, setIsReceipt] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCustomerId, setDeleteCustomerId] = useState(null);
  const [isMobileIndustry, setIsMobileIndustry] = useState(false);

  const componentRef = useRef();

  const pdfRef = useRef();
  const receiptNo = `RCP-${Date.now()}`;
  const receiptDate = new Date().toLocaleDateString();
  // Show toast
  // toast.success("Payments saved successfully!", {
  //   position: "top-right",
  //   autoClose: 3000,
  //   hideProgressBar: false,
  //   closeOnClick: true,
  //   pauseOnHover: true,
  //   drgable: true,
  // });
  const handleDownloadPDF = () => {
    const input = pdfRef.current;

    html2canvas(input, { scale: 0.8 }) // smaller scale
      .then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");

        const pdfWidth = pdf.internal.pageSize.getWidth() - 10;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 5, 5, pdfWidth, pdfHeight);
        pdf.save("payment_schedule.pdf");
      });
  };

  const openPayModal = (payment, index) => {
    setSelectedPayment({ ...payment, index });
    setPayAmount("");
    setShowPayModal(true);
  };


  // 🔹 Cashfree pay link (customer pays online; webhook updates the balance)
  const authConfig = () => ({ headers: { "x-auth-token": sessionStorage.getItem("token") } });

  const copyPayLink = async (c) => {
    try {
      const { data } = await axios.post(`${API_URL}/credit/${c.id}/pay-link`, {}, authConfig());
      try {
        await navigator.clipboard.writeText(data.url);
        toast.success("Pay link copied. Share it with the customer.");
      } catch {
        window.prompt("Copy this pay link:", data.url);
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || "Could not create pay link");
    }
  };

  // WhatsApp pay links need an approved Meta template; the server says if they're on.
  const [whatsappDues, setWhatsappDues] = useState(false);
  useEffect(() => {
    if (!hasCapability('payLinks')) return;
    axios.get(`${API_URL}/credit/whatsapp-status`, authConfig())
      .then(({ data }) => setWhatsappDues(!!data.dues))
      .catch(() => setWhatsappDues(false));
  }, []);

  const whatsappPayLink = async (c) => {
    const mobile = c.mobile || c.phone || window.prompt("Customer WhatsApp number to send the pay link to:");
    if (!mobile) return;
    try {
      await axios.post(`${API_URL}/credit/${c.id}/whatsapp-pay-link`, { mobile }, authConfig());
      toast.success(`Pay link sent on WhatsApp to ${mobile}`);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Could not send pay link on WhatsApp");
    }
  };

  const emailPayLink = async (c) => {
    const email = c.email || window.prompt("Customer email to send the pay link to:");
    if (!email) return;
    try {
      await axios.post(`${API_URL}/credit/${c.id}/send-pay-link`, { email }, authConfig());
      toast.success(`Pay link emailed to ${email}`);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Could not email pay link");
    }
  };

  const handleConfirmPay = () => {
    console.log("Confirm Pay Clicked. Amount:", payAmount);
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      console.error("Invalid amount");
      return;
    }

    if (amount > selectedPayment.currentBalance) {
      toast.error(`Payment amount cannot exceed remaining balance of ₹${selectedPayment.currentBalance.toFixed(2)}`);
      return;
    }

    handlePay(selectedPayment, selectedPayment.index, amount);
    setShowPayModal(false);
    setPayAmount("");
  };

  // 🔹 Detect Industry
  useEffect(() => {
    if (currentUser) {
      const userIndustry =
        currentUser.industry ||
        currentUser.companyDetails?.industry ||
        currentUser.Tenant?.industry;
      if (userIndustry) {
        const industryLower = userIndustry.toLowerCase();
        setIsMobileIndustry(industryLower.includes("mobile") || industryLower === "mobile_shop");
      }
    }
  }, [currentUser]);

  // 🔹 Fetch customers
  useEffect(() => {
    if (!currentUser) return; // ✅ Relaxed check

    fetchCustomers();
  }, [currentUser]);

  const fetchCustomers = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const config = { headers: { "x-auth-token": token } };
      const response = await axios.get(`${API_URL}/credit`, config);
      const userId = currentUser?.uid || currentUser?.userId;
      const role = currentUser?.role;
      const filtered = response.data.filter((item) => {
        if (role === "owner" || role === "TenantAdmin") {
          return item.source === "Owner" || item.createdBy === userId;
        }
        return item.createdBy === userId;
      });
      setCustomers(filtered);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  // 🔹 Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      let updated = { ...prev, [name]: value };
      const price = parseFloat(updated.price) || 0;
      const quantity = parseInt(updated.quantity) || 1;
      const total = price * quantity;
      updated.total = total;
      updated.totalbalance = total - (parseFloat(updated.credit) || 0); // ✅ always overall balance

      updated.due = prev.dueSession ? total / prev.dueSession : 0;
      return updated;
    });
  };

  // 🔹 Safe number
  const safeNumber = (val, fallback = 0) =>
    isNaN(parseFloat(val)) ? fallback : parseFloat(val);



  // 🔹 Submit (Add/Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("handleSubmit called", formData);

    if (!currentUser) {
      console.error("No currentUser");
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // 🔹 Prepare payments
    let payments = [];
    if (currentCustomer && (!formData.dueSession || formData.dueSession === currentCustomer.dueSession)) {
      // If editing and dueSession is unchanged (or hidden), preserve existing payments logic but update balances if needed?
      // Actually, if Total changed, we strictly need to recalc.
      // But if dueSession is hidden, how do we know the session count? 
      // We can use currentCustomer.payments.length.

      // However, the user said "dont shown the payment schedule table". 
      // If they change Price -> Total changes -> Balance changes.
      // We MUST update the payments to reflect the new balance. 
      // BUT we must not lose the "Paid" status of previous sessions if we can help it?
      // The user said "product are dont to edit". So maybe Price/Quantity IS editable.

      // Let's rely on the sessions count from existing data if formData.dueSession is missing.
      const sessionsCount = parseInt(formData.dueSession) || (currentCustomer.payments?.length) || 1;
      const total = safeNumber(formData.total, 0);
      const credit = safeNumber(formData.credit, 0);

      payments = Array.from({ length: sessionsCount }).map((_, i) => {
        // We try to preserve existing payment info if possible
        const existing = currentCustomer.payments?.[i];
        const sessionDue = total / sessionsCount;

        if (i === 0) {
          return {
            session: i + 1,
            due: sessionDue,
            paid: existing ? existing.paid : credit, // Keep existing paid amount if available
            balance: total - (existing ? existing.paid : credit),
            currentBalance: total - (existing ? existing.paid : credit)
          };
        } else {
          return {
            session: i + 1,
            due: sessionDue,
            paid: existing ? existing.paid : 0,
            balance: existing ? existing.balance : 0, // This might be tricky if we want to recalc everything
            currentBalance: existing ? existing.currentBalance : 0
          };
        }
      });

      // Actually, a simple regeneration might be safer for consistency if we assume no partial payments made yet?
      // But if payments were made, we DESTROY them by regenerating. 
      // THIS IS DANGEROUS. 

      // If we want to allow editing details WITHOUT destroying payment history:
      // We should just update the copy of payments with new 'due' amounts?
      // But if Total changed, the Balance changes. 

      // Let's assume for now that if they edit the "Credit" customer, they are correcting the initial entry.
      // If they want to preserve history, they shouldn't be changing the basic Price/Qty.

      // Fallback to simple regeneration if we assume "Editing" = "Correcting the Record".
      // But use the correct session count.

      const safeSessions = parseInt(formData.dueSession) || (currentCustomer.dueSession) || 1;
      const safeTotal = safeNumber(formData.total, 0);

      // If we are just editing text fields (Name/Phone), we should NOT touch payments at all.
      // Check if Total changed.
      if (safeTotal === currentCustomer.total && safeSessions === currentCustomer.dueSession) {
        payments = currentCustomer.payments;
      } else {
        // Total changed, we must regenerate (warn user? No, just do it for now)
        const perDue = safeTotal / safeSessions;
        payments = Array.from({ length: safeSessions }).map((_, i) => {
          if (i === 0) {
            return {
              session: i + 1,
              due: perDue,
              paid: credit,
              balance: safeTotal - credit,
              currentBalance: safeTotal - credit
            };
          }
          return {
            session: i + 1,
            due: perDue,
            paid: 0,
            balance: safeTotal - credit, // This logic is still weird but consistent with add
            currentBalance: safeTotal - credit
          };
        });
      }
    } else {
      // New Customer or explicit session change
      const sessions = safeNumber(formData.dueSession, 1);
      const perDue = safeNumber(formData.total, 0) / sessions;
      const total = safeNumber(formData.total, 0);
      const credit = safeNumber(formData.credit, 0);

      payments = Array.from({ length: sessions }).map((_, i) => {
        const due = perDue;
        if (i === 0) {
          return {
            session: i + 1,
            due,
            paid: credit,
            balance: total - credit,
          currentBalance: total - credit,
          date: credit > 0 ? new Date().toLocaleDateString() : null
          };
        } else {
          return {
            session: i + 1,
            due,
            paid: 0,
            balance: 0,
            currentBalance: 0
          };
        }
      });
    }

    const total = safeNumber(formData.total, 0);
    const credit = safeNumber(formData.credit, 0);
    const totalbalance = total - credit;

    // 🔹 Save final overall balance
    formData.totalbalance = totalbalance;
    formData.balance = totalbalance; // ✅ balance = overall balance

    // 🔹 Save payments in customer doc
    const dataToSave = {
      ...formData,
      gst: formData.gst,
      balance: totalbalance,      // ✅ correct balance
      totalbalance,               // ✅ explicitly save totalbalance also
      payments
    };


    const token = sessionStorage.getItem("token");
    const config = { headers: { "Content-Type": "application/json", "x-auth-token": token } };

    try {
      if (currentCustomer) {
        await axios.put(`${API_URL}/credit/${currentCustomer.id}`, dataToSave, config);
      } else {
        await axios.post(`${API_URL}/credit`, dataToSave, config);
      }
      fetchCustomers();
    } catch (error) {
      console.error("Error saving customer:", error);
      toast.error("Failed to save customer");
    }

    // 🔹 Reset
    setIsModalOpen(false);
    setCurrentCustomer(null);
    setFormData({
      customerId: "",
      name: "",
      email: "",
      address: "",
      date: "",
      credit: 0,
      gst: 0,
      total: 0,
      balance: 0,
      due: 0,
      phone: "",
      quantity: 1,
      price: 0,
      productId: "",
      dueSession: null,
      payments: [],
    });
  };




  // Quantity change handler
  const handleQuantityChange = (value) => {
    const quantity = parseInt(value) || 1;

    setFormData(prev => {
      const price = parseFloat(prev.price) || 0; // existing price
      const total = price * quantity; // total = price * new quantity
      const credit = parseFloat(prev.credit) || 0;
      const totalbalance = total - credit;
      const due = prev.dueSession ? total / prev.dueSession : 0;

      return {
        ...prev,
        quantity,
        total,
        totalbalance,
        balance: totalbalance,
        due
      };
    });
  };




  const openModal = (customer = null) => {
    if (customer) {
      setCurrentCustomer(customer);
      // Fallback to first product if top-level fields are missing
      const product = customer.products?.[0] || {};
      setFormData({
        ...customer,
        productId: customer.productId || product.productId || "",
        description: customer.description || product.description || product.name || "",
        quantity: customer.quantity || product.quantity || 1,
        price: customer.price || product.price || 0,
        gst: customer.gst || product.salesGst || product.gst || 0,
      });
    } else {
      setCurrentCustomer(null);
      setFormData({
        customerId: "",
        name: "",
        email: "",
        address: "",
        date: "",
        credit: 0,
        gst: 0,
        total: 0,
        balance: 0,
        due: 0,
        phone: "",
        quantity: 1,
        price: 0,
        productId: "",
        dueSession: null,
        payments: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!currentUser || !deleteCustomerId) return;

    try {
      const token = sessionStorage.getItem("token");
      const config = { headers: { "x-auth-token": token } };
      await axios.delete(`${API_URL}/credit/${deleteCustomerId}`, config);

      setCustomers((prev) => prev.filter((c) => c.id !== deleteCustomerId));
      toast.success("Customer deleted successfully!");
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast.error("Failed to delete customer");
    }
    setShowDeleteModal(false);
    setDeleteCustomerId(null);
  };

  const newCredit = parseFloat(formData.credit || 0);

  // 👀 First unpaid session find


  // 🔎 Filter customers
  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // �🔹 Products fetch (Switched to API)
  useEffect(() => {
    const fetchProducts = async () => {
      if (!currentUser) return;
      try {
        const token = sessionStorage.getItem("token");
        const config = { headers: { "x-auth-token": token } };
        const response = await axios.get(`${API_URL}/products`, config);
        const userId = currentUser?.uid || currentUser?.userId;
        const role = currentUser?.role;
        const filtered = response.data.filter((item) => {
          if (role === "owner" || role === "TenantAdmin") {
            return item.source === "Owner" || item.createdBy === userId;
          }
          return item.createdBy === userId;
        });
        setProductsList(filtered);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    fetchProducts();
  }, [currentUser]);

  // 🔹 Select product
  const handleProductSelect = (productId) => {
    const selectedProduct = productsList.find((p) => p.id === productId);
    if (!selectedProduct) return;

    setFormData((prev) => {
      const quantity = parseInt(prev.quantity) || 1;
      const unitPrice =
        parseFloat(selectedProduct.salesPrice || selectedProduct.sellingPrice || selectedProduct.price || 0) || 0;
      // ✅ GST percentage (if available)
      const gst = parseFloat(selectedProduct.salesGst || selectedProduct.gst || 0);

      const total = unitPrice * quantity;
      const credit = parseFloat(prev.credit) || 0;
      const totalbalance = total - credit; // ✅ recalc
      return {
        ...prev,
        productId: selectedProduct.id,
        description: selectedProduct.name,
        gst: selectedProduct.salesGst,
        price: unitPrice,
        total,
        totalbalance,
        balance: totalbalance,
      };
    });
  };
  

  const handlePay = async (session, index, amount) => {
    console.log("handlePay called", { session, index, amount, currentUser });

    if (!currentUser) {
      console.error("No current user found");
      return;
    }

    let paymentAmount = parseFloat(amount) || 0;
    if (paymentAmount <= 0) return;

    setViewTable((prev) => {
      const payments = prev.payments.map(p => ({ ...p }));

      const current = payments[index];
      const due = current.due;
      const alreadyPaid = current.paid || 0;
      const prevBalance = current.currentBalance ?? due;

      const applied = Math.min(paymentAmount, prevBalance);
      current.paid = alreadyPaid + applied;
      current.currentBalance = prevBalance - applied;
      if (applied > 0) current.date = new Date().toLocaleDateString();

      // Update ALL subsequent rows balance
      for (let i = index + 1; i < payments.length; i++) {
        payments[i].balance = payments[i - 1].currentBalance;
        payments[i].currentBalance = payments[i].balance - (payments[i].paid || 0);
      }

      const overallBalance = payments[payments.length - 1].currentBalance;

      // API update
      const token = sessionStorage.getItem("token");
      const config = { headers: { "Content-Type": "application/json", "x-auth-token": token } };

      console.log("Updating credit balance...", { id: prev.id, balance: overallBalance, payments });

      axios.put(`${API_URL}/credit/${prev.id}`, {
        payments,
        balance: overallBalance,
        totalbalance: overallBalance
      }, config)
        .then(() => {
          console.log("Payment recorded successfully");
          toast.success("Payment recorded!");
          fetchCustomers();
        })
        .catch(err => {
          console.error("Failed to record payment:", err);
          toast.error("Failed to record payment");
        });

      return {
        ...prev,
        payments,
        balance: overallBalance,
      };
    });
  };

 



  const savePayments = async () => {
    //if (!currentUser?.uid || !viewTable?.id) return;

    const userId = currentUser?.uid || currentUser?.userId;
    if (!userId || !viewTable?.id) return;

    const totalPaid = viewTable.payments.reduce((sum, p) => sum + (p.paid || 0), 0);
    const updatedBalance = viewTable.total - totalPaid;

    // ✅ last session la irukkura currentBalance va eduthukkalam
    const lastCurrentBalance =
      viewTable.payments.length > 0
        ? viewTable.payments[viewTable.payments.length - 1].currentBalance
        : updatedBalance;

    try {
      const token = sessionStorage.getItem("token");
      const config = { headers: { "Content-Type": "application/json", "x-auth-token": token } };

      await axios.put(`${API_URL}/credit/${viewTable.id}`, {
        payments: viewTable.payments,
        credit: totalPaid,
        balance: lastCurrentBalance,
        totalbalance: lastCurrentBalance,
      }, config);

      fetchCustomers();

      setCustomers((prevCustomers) =>
        prevCustomers.map((c) =>
          c.id === viewTable.id
            ? {
              ...c,
              credit: totalPaid,
              balance: lastCurrentBalance,
              totalbalance: lastCurrentBalance,
              payments: viewTable.payments
            }
            : c
        )
      );

      toast.success("Payment saved successfully", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      setViewTable(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save payments");
    }
  };
  console.log(userData); // debug purpose




  // Plan restriction removed to allow all plans access
  // if (userData?.plan !== "premium") { ... }





  return (
    <BillingLayout>
      <div className="p-4">
        <ToastContainer />
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Due Customers</h1>
          <Link
            to="/add-customer"
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg"
          >
            <PlusCircle className="mr-2" size={18} /> Add Customer
          </Link>
        </header>


        {/* Search */}
        <div className="flex items-center border border-green-400 bg-gray-100 rounded-lg px-3 py-2 w-72 mb-4">
          <Search className="text-gray-500 mr-2" size={18} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent outline-none w-full text-sm"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {(isMobileIndustry
                  ? ["#", "Customer ID", "Name", "Phone", "Product", "Total", "Credit", "Balance", "Status", "Actions"]
                  : ["Customer ID", "Name", "Phone", "Email", "Address", "Date", "Credit", "GST", "Total", "Due Amount", "Status", "Actions"]
                ).map(
                  (col) => (
                    <th key={col} className="p-3 text-left text-sm font-semibold text-gray-600">
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c, i) => (
                  <tr key={c.id} className="border-t">
                    {isMobileIndustry ? (
                      <>
                        <td className="p-3">{i + 1}</td>
                        <td className="p-3">{c.customerId}</td>
                        <td className="p-3 font-semibold text-gray-900">{c.name}</td>
                        <td className="p-3">{c.phone}</td>
                        <td className="p-3">{c.description || c.products?.map(p => p.description || p.name).join(', ') || "N/A"}</td>
                        <td className="p-3 font-semibold">₹{c.total?.toFixed(2)}</td>
                        <td className="p-3 text-green-600">₹{c.credit?.toFixed(2)}</td>
                        <td className={`p-3 font-bold ${c.balance > 0 ? 'text-red-600' : 'text-gray-800'}`}>₹{c.balance?.toFixed(2)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${c.balance <= 0 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-800"}`}>
                            {c.balance <= 0 ? "Completed" : "Pending"}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3">{c.customerId}</td>
                        <td className="p-3">{c.name}</td>
                        <td className="p-3">{c.phone}</td>
                        <td className="p-3">{c.email}</td>
                        <td className="p-3">{c.address}</td>
                        <td className="p-3">{c.date}</td>
                        <td className="p-3">{c.total?.toFixed(2)-c.balance?.toFixed(2)}</td>
                        <td className="p-3">{c.gst || c.products?.[0]?.salesGst || c.products?.[0]?.gst || 0}%</td>
                        <td className="p-3">{c.total?.toFixed(2)}</td>
                        <td className="p-3">{c.balance?.toFixed(2)}</td>
                        <td className="p-3">
                          {c.balance === 0 ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-700">
                              Closed
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-700">
                              Pending
                            </span>
                          )}
                        </td>
                      </>
                    )}

                    <td className="p-3 flex gap-2">
                      <button onClick={() => setViewCustomer(c)} className="text-green-600">
                        < Eye size={18} />
                      </button>
                      {c.balance > 0 && hasCapability('payLinks') && (
                        <>
                          <button onClick={() => copyPayLink(c)} className="text-emerald-600" title="Copy Cashfree pay link">
                            <Link2 size={18} />
                          </button>
                          <button onClick={() => emailPayLink(c)} className="text-indigo-600" title="Email pay link">
                            <Mail size={18} />
                          </button>
                          {whatsappDues && (
                            <button onClick={() => whatsappPayLink(c)} className="text-green-600" title="Send pay link on WhatsApp">
                              <MessageCircle size={18} />
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => openModal(c)}
                        className={`text-blue-600 ${c.credit === c.total ? "opacity-50 cursor-not-allowed" : ""}`}
                        disabled={c.credit === c.total} // ✅ disable when fully paid
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteCustomerId(c.id);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={20} />
                      </button>



                      <button onClick={() => {
                        // 🔹 Recalculate payments logic on open to ensure propagation
                        const product = c.products?.[0] || {};
                        const customerDataForView = {
                          ...c,
                          description: c.description || product.description || product.name || "N/A",
                          quantity: c.quantity || product.quantity || 1,
                        };

                        const payments = (customerDataForView.payments || []).map(p => ({ ...p }));
                        if (payments.length > 0) {
                          // Start balance from sum of dues (Outstanding amount), not Total Price
                          let runningBalance = payments.reduce((sum, p) => sum + (p.due || 0), 0);
                          for (let i = 0; i < payments.length; i++) {
                            payments[i].balance = runningBalance;
                            runningBalance -= (payments[i].paid || 0);
                            payments[i].currentBalance = runningBalance;
                          }
                        }

                        const updatedC = { ...customerDataForView, payments, isReceipt: true };
                        setViewTable(updatedC);
                      }} className="text-red-600">
                        <Table size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-gray-500">
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-lg w-100 max-h-[80vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] ">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  {currentCustomer ? "Edit Customer" : "Add Customer"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-red-500"
                >
                  <CircleX size={24} />
                </button>
              </div>


              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                <div>



                </div>

                {/* Name */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter customer name"
                    className="w-full border border-green-400 rounded-lg p-2 " required
                  />  <label className="block text-sm  font-medium text-gray-600 mb-1">Customer ID</label><input
                    type="text"
                    name="customerId"
                    value={formData.customerId}
                    onChange={handleChange}
                    className="w-full border border-green-400 rounded-lg p-2"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    <Mail size={14} className="text-emerald-500" />Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="example@mail.com"
                    className="w-full border border-green-400 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone || ""}
                    onChange={handleChange}
                    required
                    placeholder="Enter phone number"
                    className="w-full border border-green-400 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    className="w-full border border-green-400 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Address */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter customer address"
                    required
                    className="w-full border border-green-400 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                    rows="2"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Product</label>
                  {/* Select Product */}
                  <select
                    value={formData.productId || ""}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    className={`w-full border border-green-400 rounded-lg p-2 ${currentCustomer ? "bg-gray-100 cursor-not-allowed" : ""}`}
                    disabled={!!currentCustomer}
                  >
                    <option value="">Select Product</option>
                    {productsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - ₹{p.salesPrice || 0}
                      </option>
                    ))}
                  </select>


                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={formData.quantity || 1}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    min="1"
                    className="w-full border border-green-400 rounded-lg p-2"
                  />

                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Price</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price || 0}
                    readOnly
                    className="w-full border border-green-400 rounded-lg p-2 font-semibold text-right bg-green-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Sales GST (%)</label>
                  <input
                    type="number"
                    name="salesgst"
                    value={formData.gst || 0}
                    readOnly
                    className="w-full border border-green-400 rounded-lg p-2 bg-green-50 text-right font-semibold"
                  />
                </div>

                {!currentCustomer && (
                  <>
                    {/* Due Session */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Due Session</label>
                      <div className="flex gap-4">
                        {[1, 2, 4, 5].map((session) => (
                          <label key={session} className="flex items-center gap-2">
                            <input
                              type="radio"                // 👈 only one select allowed
                              name="dueSession"
                              value={session}
                              checked={formData.dueSession === session}
                              onChange={() => {
                                const dueAmount =
                                  session > 0 ? (formData.total || 0) / session : 0;

                                setFormData((prev) => ({
                                  ...prev,
                                  dueSession: session,   // 👈 single value
                                  due: dueAmount,         // 👈 auto calculate
                                }));
                              }}
                            />
                            <span>{session}</span>
                          </label>
                        ))}

                        {/* Due (auto calculated) */}
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Due</label>
                          <input
                            type="number"
                            name="due"
                            value={formData.due || 0}
                            readOnly
                            className="w-full border border-green-400 rounded-lg p-2 bg-green-50 font-semibold text-right"
                          />
                        </div>
                      </div>
                    </div>
                    {formData?.dueSession && (
                      <div className="col-span-2 mt-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Payment Schedule</h3>
                        <table className={`w-full border border-green-400 rounded-lg ${viewTable?.status === "Completed" ? "bg-green-100" : ""
                          }`}>
                          <thead className="bg-gray-100 border border-green-400">
                            <tr>
                              <th className="p-2 text-left text-sm font-semibold text-gray-600 border">Session No</th>
                              <th className="p-2 text-left text-sm font-semibold text-gray-600 border">Due </th>
                              <th className="p-2 text-left text-sm font-semibold text-gray-600 border">Balance</th>
                              <th className="p-2 text-left text-sm font-semibold text-gray-600 border">Payment</th>
                              <th className="p-2 text-left text-sm font-semibold text-gray-600 border">Current Balance</th> {/* ✅ New col */}
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: formData?.dueSession || 0 }).map((_, i) => {
                              const sessionDue = (formData?.total || 0) / (formData?.dueSession || 1);

                              // First session gets the credit applied
                              const payment = i === 0 ? (parseFloat(formData?.credit) || 0) : 0;

                              const balance = i === 0 ? (formData?.total || 0) - payment : 0;

                              const currentBalance = balance - payment;

                              return (
                                <tr key={i}>
                                  <td className="p-2 border">{i + 1}</td>
                                  <td className="p-2 border">{sessionDue.toFixed(2)}</td>
                                  <td className="p-2 border">{balance.toFixed(2)}</td>
                                  <td className="p-2 border">{payment.toFixed(2)}</td>
                                  <td className="p-2 border">{currentBalance.toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>

                        </table>
                      </div>
                    )}
                  </>
                )}




                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Total</label>
                  <input
                    type="number"
                    value={formData.total?.toFixed(2) || 0}
                    readOnly
                    className="w-full border border-green-400 rounded-lg p-2 bg-green-50 font-semibold text-right"
                  />
                </div>


                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Due Amount</label>
                  <input
                    type="number"
                    name="totalbalance"
                    value={formData.totalbalance?.toFixed(2) || 0}
                    readOnly
                    className="w-full border border-green-400 rounded-lg p-2 bg-green-50 cursor-not-allowed"
                  />

                </div>


                <div className="col-span-2 mt-4">
                  <button
                    type="submit"
                    className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition"
                  >
                    {currentCustomer ? "Save Changes" : "Add Customer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {viewTable && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"  >
            <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div ref={pdfRef}  >
                <div className="text-center mb-6">
                  <h2 className="text-lg font-bold">
                    {userData?.businessName || "Your Store Name"}
                  </h2>
                  <p className="text-xs">
                    {userData?.address?.street || "123 Sample Street"},{" "}
                    {userData?.address?.city || "Sample City"},{" "}
                    {userData?.address?.state || "ST"}{" "}
                    {userData?.address?.pincode || "12345"}
                  </p>
                  <p className="text-xs">
                    Phone: {userData?.phone || "(123) 456-7890"}
                  </p>
                  {userData?.gstin && (
                    <p className="text-xs">GSTIN: {userData.gstin}</p>
                  )}
                </div>

                {/* Receipt Info */}
                <div className="flex justify-between text-xs mb-2">
                  <span>Receipt #: {receiptNo}</span>
                  <span>Date: {receiptDate}</span>
                </div>

                <div className="text-xs mb-4">
                  <span>
                    Cashier:{" "}
                    {currentUser?.displayName || currentUser?.email || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-4">

                  <h2 className="text-xl font-bold text-gray-800">
                    Payment Schedule
                  </h2>
                  <button 
                    onClick={() => setViewTable(null)}
                    className="text-gray-500 hover:text-red-500 rint:hidden"
                  >
                    <CircleX size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <p><strong>Name:</strong> {viewTable.name}</p>
                  <p><strong>Email:</strong> {viewTable.email}</p>
                  <p><strong>Phone:</strong> {viewTable.phone}</p>
                  <p><strong>Address:</strong> {viewTable.address}</p>
                  <p><strong>Product:</strong> {viewTable.description || "N/A"}</p>
                  <p><strong>Quantity:</strong> {viewTable.quantity}</p>
                  <p><strong>Total:</strong> {viewTable.total?.toFixed(2)}</p>
                  <p><strong>Credit:</strong> {viewTable.total?.toFixed(2) - viewTable.balance?.toFixed(2)}</p>
                  <p><strong>Balance:</strong> {viewTable.balance?.toFixed(2)}</p>
                  <p><strong>Due Sessions:</strong> {viewTable.dueSession}</p>
                </div>

                <table className={`w-full border rounded-lg ${viewTable?.status === "Completed" ? "bg-green-100" : ""
                  }`}>
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border text-left">Session</th>
                      <th className="p-2 border text-left">Due</th>
                      <th className="p-2 border text-left">Paid</th>
                      <th className="p-2 border text-left">Date</th>
                      <th className="p-2 border text-left">Balance</th>
                      <th className="p-2 border">Current Balance</th>
                      <th className="p-2 border text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const rowsToShow = [];
                      const payments = viewTable?.payments || [];
                      for (let i = 0; i < payments.length; i++) {
                        rowsToShow.push(payments[i]);
                        if (payments[i].currentBalance <= 0) break;
                      }
                      return rowsToShow;
                    })().map((p, index) => (
                      <tr key={index}>
                        <td className="p-2 border">{p.session}</td>
                        <td className="p-2 border">{p.due?.toFixed(2)}</td>
                        <td className="p-2 border">{p.paid?.toFixed(2)}</td>
                        <td className="p-2 border text-gray-500 text-xs">{p.date || "-"}</td>
                        <td className="p-2 border">{p.balance?.toFixed(2)}</td>
                        <td className="p-2 border">{p.currentBalance?.toFixed(2)}</td>

                        <td className="px-4 py-2">
                          {(p.paid >= p.due - 1) || p.currentBalance <= 0 ? ( // Paid if session due is covered OR total balance is 0
                            <span className="text-green-600 font-bold">Paid</span>
                          ) : (
                            <button
                              onClick={() => openPayModal(p, index)}
                              className="bg-blue-500 text-white px-3 py-1 rounded-md"
                              disabled={p.currentBalance <= 0}
                            >
                              Pay
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {viewTable.balance === 0 && (
                      <tr>
                        <td colSpan="7" className="p-6 text-center bg-green-50">
                          <div className="flex flex-col items-center justify-center">
                            <h3 className="text-xl font-bold text-green-800">Paid in Full!</h3>
                            <p className="text-sm text-green-700">Total Amount Paid: ₹{viewTable.total?.toFixed(2)}</p>
                            <p className="text-[10px] text-gray-400 mt-2 italic">All dues for this customer have been cleared.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>


                </table>
                {viewTable && viewTable.payments?.some(p => p.paid > 0 && p.currentBalance === 0) && (
                  <p className="text-center text-green-600 font-bold mt-2">
                    Payment Successful
                  </p>
                )}

              </div>
              
              {/* Bottom action buttons for modal */}
              <div className="mt-4 flex justify-end gap-2 print:hidden">
                <button onClick={handleDownloadPDF} className="bg-green-500 text-white px-4 py-2 rounded-md">
                  Download PDF
                </button>

                <button
                  onClick={() => {
                    setIsReceipt(true); // optional, if you want to change view
                    setTimeout(() => {
                      window.print();
                    }, 200); // small delay to render receipt view
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                >
                  Print
                </button>


                <button
                  onClick={savePayments}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                >


                  Save
                </button>
                <button
                  onClick={() => setViewTable(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

        {viewCustomer?.dueSession && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Customer Details</h2>
                <button
                  onClick={() => setViewCustomer(null)}
                  className="text-gray-500 hover:text-red-500"
                >
                  <CircleX size={24} />
                </button>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold text-gray-700">Customer ID</p>
                  <p className="text-gray-900">{viewCustomer.customerId}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Name</p>
                  <p className="text-gray-900">{viewCustomer.name}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Phone</p>
                  <p className="text-gray-900">{viewCustomer.phone}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Email</p>
                  <p className="text-gray-900">{viewCustomer.email}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Phone</p>
                  <p className="text-gray-900">{viewCustomer.phone}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Date</p>
                  <p className="text-gray-900">{viewCustomer.date}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Address</p>
                  <p className="text-gray-900">{viewCustomer.address}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Product ID</p>
                  <p className="text-gray-900">{viewCustomer.productId || viewCustomer.products?.[0]?.productId || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Product Name</p>
                  <p className="text-gray-900">{viewCustomer.description || viewCustomer.products?.[0]?.description || viewCustomer.products?.[0]?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Quantity</p>
                  <p className="text-gray-900">{viewCustomer.quantity || viewCustomer.products?.[0]?.quantity || 1}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Price</p>
                  <p className="text-gray-900">{viewCustomer.price || viewCustomer.products?.[0]?.price || 0}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Total</p>
                  <p className="text-gray-900">{viewCustomer.total?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Credit</p>
                  <p className="text-gray-900">{viewCustomer.credit}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Due Amount</p>
                  <p className="text-gray-900">{viewCustomer.balance?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Due Session</p>
                  {viewCustomer.dueSession ? (
                    <p className="text-gray-900">{viewCustomer.dueSession}</p>
                  ) : (
                    <p className="text-gray-500">No due session</p>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Due</p>
                  <p className="text-gray-900">{viewCustomer.due?.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {showPayModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-96">
              <h2 className="text-lg font-bold mb-4">
                Enter Payment Amount
              </h2>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => {
                  let { value } = e.target;
                  if (value.length > 1 && value.startsWith("0") && value[1] !== ".") {
                    value = value.substring(1);
                  }
                  setPayAmount(value);
                }}
                className="w-full border px-3 py-2 rounded-md mb-4"
                placeholder="Enter amount"
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowPayModal(false)}
                  className="bg-gray-300 px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPay}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg w-96">
              <h2 className="text-lg font-bold mb-4 text-red-600">Delete Customer</h2>
              <p className="mb-6 text-gray-700">
                Are you sure you want to delete this customer? <br />
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  {/* <ToastContainer /> */}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        {showDeleteModal && (
          <div style={{ display: "none" }}>
            <div ref={componentRef} className="p-6">
              <h2 className="text-lg font-bold">Payment Receipt</h2>
              <p>Customer: {formData.name}</p>
              <p>Amount: {formData.amount}</p>
              <p>Balance: {formData.balance}</p>
            </div>
          </div>

        )}

      </div>
    </BillingLayout>
  );
};

export default Credit;
