
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import { ArrowLeft } from "lucide-react";
import axios from "axios";
import API_URL from "../../config/api";
import { toast, Toaster } from "react-hot-toast";

export default function AddCustomer() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [productsList, setProductsList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [isMobileIndustry, setIsMobileIndustry] = useState(false);

  const [products, setProducts] = useState([
    { productId: "", description: "", quantity: 1, price: 0, gst: 0 },
  ]);

  const [formData, setFormData] = useState({
    customerId: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    date: new Date().toISOString().slice(0, 10),
    credit: 0,
    dueSession: 1,
    total: 0,
    balance: 0,
    totalbalance: 0, // Added for consistency with Credit.jsx
    duePerSession: 0,
  });

  // ================= FETCH PRODUCTS =================
  useEffect(() => {
    const fetchProducts = async () => {
      if (!currentUser) return;
      try {
        const token = sessionStorage.getItem("token");
        const config = { headers: { "x-auth-token": token } };
        const response = await axios.get(`${API_URL}/products`, config);
        setProductsList(response.data);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    fetchProducts();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      const userIndustry =
        currentUser.industry || currentUser.companyDetails?.industry;
      if (userIndustry) {
        const isMobile =
          userIndustry.toLowerCase().includes("mobile") ||
          userIndustry.toLowerCase() === "mobile_shop";
        setIsMobileIndustry(isMobile);
      }
    }
  }, [currentUser]);

  // ================= CALCULATE TOTAL =================
  const calculateTotals = (updatedProducts, creditValue, sessions) => {
    let total = 0;

    updatedProducts.forEach((p) => {
      const qty = Number(p.quantity) || 1;
      const price = Number(p.price) || 0;
      const gst = Number(p.gst) || 0;

      const subtotal = qty * price;
      const gstAmount = (subtotal * gst) / 100;

      total += subtotal + gstAmount;
    });

    const credit = Number(creditValue) || 0;
    const balance = total - credit;
    const sessionCount = Number(sessions) || 1;

    setFormData((prev) => ({
      ...prev,
      total,
      balance,
      totalbalance: balance, // Start with totalbalance = balance
      duePerSession:
        sessionCount > 0 ? balance / sessionCount : 0,
    }));
  };

  // ================= PRODUCT CHANGE =================
  const handleProductChange = (index, field, value) => {
    const updated = [...products];

    if (field === "quantity") {
      const productId = updated[index].productId;
      const productInStock = productsList.find((p) => p.id === productId);

      if (productInStock) {
        const availableQty = Number(productInStock.quantity) || 0;
        if (Number(value) > availableQty) {
          toast.error(`Only ${availableQty} units available in stock`);
          return;
        }
      }
    }

    updated[index][field] = value;
    setProducts(updated);
    calculateTotals(updated, formData.credit, formData.dueSession);
  };

  const handleProductSelect = (index, id) => {
    const product = productsList.find((p) => p.id === id);
    if (!product) return;

    let description = product.name;
    const unitPrice = Number(product.sellingPrice) || Number(product.salesPrice) || Number(product.salePrice) || Number(product.price) || 0;
    const qtyPerUnit = Number(product.unit) || 1;

    const updated = [...products];
    updated[index] = {
      ...updated[index],
      productId: id,
      description: description,
      price: unitPrice,
      qtyPerUnit: qtyPerUnit,
      gst: Number(product.salesGst) || Number(product.salesgst) || Number(product.gst) || Number(product.taxRate) || Number(product.gstRate) || 0,
      quantity: 1,
    };
    setProducts(updated);
    calculateTotals(updated, formData.credit, formData.dueSession);
  };


  const handleCreditChange = (e) => {
    let { value } = e.target;

    // Remove leading zero if user enters a number (e.g. "05" -> "5")
    if (value.length > 1 && value.startsWith("0") && value[1] !== ".") {
      value = value.substring(1);
    }

    setFormData((prev) => ({
      ...prev,
      credit: value,
    }));

    calculateTotals(products, value, formData.dueSession);
  };

  const handleDueSessionChange = (session) => {
    setFormData((prev) => ({
      ...prev,
      dueSession: session,
    }));

    calculateTotals(products, formData.credit, session);
  };

  const addProductRow = () => {
    setProducts([
      ...products,
      { productId: "", description: "", quantity: 1, price: 0, gst: 0 },
    ]);
  };

  // ================= PAYMENT SCHEDULE PREVIEW =================
  const renderSchedule = () => {
    const sessions = Number(formData.dueSession);
    if (!sessions || sessions <= 0) return null;

    const perDue = formData.duePerSession;
    let runningBalance = formData.balance;

    return (
      <div className="mt-6">
        <h3 className="font-semibold mb-2">Payment Schedule</h3>

        <table className="w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Session</th>
              <th className="border p-2">Due</th>
              <th className="border p-2">Paid</th>
              <th className="border p-2">Remaining Balance</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: sessions }).map((_, i) => {
              const paid = 0;

              runningBalance = runningBalance - perDue;
              const currentBalance = runningBalance;

              return (
                <tr key={i}>
                  <td className="border p-2">{i + 1}</td>
                  <td className="border p-2">
                    {(perDue || 0).toFixed(2)}
                  </td>
                  <td className="border p-2">
                    {(paid || 0).toFixed(2)}
                  </td>
                  <td className="border p-2">
                    {(Math.max(0, currentBalance) || 0).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ================= VALIDATION =================
  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("Customer Name is required");
      return false;
    }
    if (!formData.phone.trim()) {
      toast.error("Phone Number is required");
      return false;
    }

    if (!/^\d{10}$/.test(formData.phone.trim())) {
      toast.error("Phone Number must be exactly 10 digits");
      return false;
    }

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast.error("Please enter a valid email address");
      return false;
    }

    for (const p of products) {
      if (!p.productId) {
        toast.error("Please select a product");
        return false;
      }
      if (Number(p.quantity) <= 0) {
        toast.error("Quantity must be greater than 0");
        return false;
      }
    }
    return true;
  };

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();
   ; // Debug log

    if (!currentUser) {
      console.error("No user logged in (currentUser is null)");
      return;
    }

    if (!validateForm()) return;

    setSubmitting(true);

    const sessions = Number(formData.dueSession) || 1;
    const perDue = formData.duePerSession;

    let runningBalance = formData.balance;

    const payments = Array.from({ length: sessions }).map((_, i) => {
      const due = perDue;

      if (i === 0) {
        return {
          session: i + 1,
          due,
          paid: 0,
          balance: formData.balance,
          currentBalance: formData.balance
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

    try {
      const token = sessionStorage.getItem("token");
      const config = {
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
      };

  

      await axios.post(
        `${API_URL}/credit`,
        {
          ...formData,
          credit: Number(formData.credit) || 0,
          products,
          payments,
          totalbalance: formData.balance
        },
        config
      );

      // Update Inventory: Reduce stock for sold products
      if (products && products.length > 0) {
        await Promise.all(products.map(async (productItem) => {
          if (!productItem.productId) return;

          const productInList = productsList.find(p => p.id === productItem.productId);
          if (productInList) {
            const currentQty = Number(productInList.quantity) || 0;
            const soldUnits = Number(productItem.quantity) || 0;
            const newQty = Math.max(0, currentQty - soldUnits);

            try {
              await axios.put(`${API_URL}/products/${productItem.productId}`, { quantity: newQty }, config);
            } catch (err) {
              console.error(`Failed to update stock for product ${productItem.productId}:`, err);
            }
          }
        }));
      }

      toast.success("Customer added successfully!");
      navigate("/credit");
    } catch (error) {
      console.error("Error adding customer:", error);
      toast.error("Failed to add customer.");
      setSubmitting(false);
    }
  };

  return (
    <BillingLayout>
      <div className="min-h-screen bg-white p-8">
        <Toaster />

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Add Customer </h1>
          <button
            onClick={() => navigate("/credit")}
            className="flex items-center gap-2 bg-gray-200 px-4 py-2 rounded-lg"
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">

          {/* CUSTOMER DETAILS */}
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Customer Details
            </h2>

            <div className="grid grid-cols-2 gap-6">

              <div>
                <label>Customer ID</label>
                <input
                  className="border p-2 rounded w-full"
                  value={formData.customerId}
                  onChange={(e) =>
                    setFormData({ ...formData, customerId: e.target.value })
                  }
                  placeholder="Enter Customer ID"
                />
              </div>

              <div>
                <label>Name <span className="text-red-500">*</span></label>
                <input
                  required
                  className="border p-2 rounded w-full"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter Name"
                />
              </div>

              <div>
                <label>Email</label>
                <input
                  type="email"
                  className="border p-2 rounded w-full"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="Enter Email"
                />
              </div>

              <div>
                <label>Phone <span className="text-red-500">*</span></label>
                <input
                  required
                  type="number"
                  className="border p-2 rounded w-full"
                  value={formData.phone}
                  onChange={(e) => {
                    const val = e.target.value.slice(0, 10);
                    setFormData({ ...formData, phone: val });
                  }}
                  placeholder="10 digit mobile"
                />
              </div>
              {/* Address */}
              <div className="col-span-2">
                <label>Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Enter customer address"
                  className="w-full border rounded-lg p-2"
                  rows="2"
                />
              </div>
              {/* Date */}
              <div>
                <label>Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                  className="w-full border rounded-lg p-2"
                />
              </div>
            </div>
          </div>

          {/* BILLING DETAILS */}
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Billing Details
            </h2>

            {products.map((product, index) => (
              <div key={index} className="border p-4 rounded mb-4">
                <label>Select Product <span className="text-red-500">*</span></label>
                <select
                  className="border p-2 rounded w-full mb-2"
                  onChange={(e) =>
                    handleProductSelect(index, e.target.value)
                  }
                  value={product.productId}
                >
                  <option value="">Select Product</option>
                  {productsList.filter(p => (Number(p.quantity) || 0) > 0).map((p) => (
                    <option key={p.id} value={p.id}>
                      {`${p.name} - ₹${p.sellingPrice || 
                        p.salesPrice ||
                        p.salePrice ||
                        p.price ||
                        0} (Stock: ${Number(p.quantity) || 0} Units)`}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label>Units <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      className="border p-2 rounded w-full"
                      value={product.quantity}
                      onChange={(e) =>
                        handleProductChange(index, "quantity", e.target.value)
                      }
                      placeholder="Enter Quantity"
                    />
                  </div>

                  <div>
                    <label>Unit Price (₹) <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      className="border p-2 rounded w-full"
                      value={product.price}
                      onChange={(e) =>
                        handleProductChange(index, "price", e.target.value)
                      }
                      placeholder="Enter Price"
                    />
                  </div>

                  <div>
                    <label>Qty per Unit</label>
                    <input
                      type="number"
                      className="border p-2 rounded w-full bg-gray-50"
                      value={product.qtyPerUnit || 1}
                      readOnly
                    />
                  </div>

                  <div>
                    <label>GST %</label>
                    <input
                      type="number"
                      className="border p-2 rounded w-full"
                      value={product.gst}
                      onChange={(e) =>
                        handleProductChange(index, "gst", e.target.value)
                      }
                      placeholder="Enter GST %"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addProductRow}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              + Add Product
            </button>

            {/* CREDIT */}
            <div className="mt-6">
              <label>Credit Paid</label>
              <input
                type="number"
                value={formData.credit}
                onChange={handleCreditChange}
                className="border p-2 rounded w-full"
                placeholder="Enter Credit Amount"
              />
            </div>

            {/* DUE SESSION */}
            <div className="mt-6">
              <label className="block mb-2">Due Sessions</label>
              <div className="flex gap-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <label key={s}>
                    <input
                      type="radio"
                      checked={formData.dueSession === s}
                      onChange={() => handleDueSessionChange(s)}
                    />{" "}
                    {s}
                  </label>
                ))}
              </div>
            </div>

            {/* TOTAL & BALANCE */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <label>Total</label>
                <input
                  value={(formData.total || 0).toFixed(2)}
                  readOnly
                  className="border p-2 rounded w-full bg-gray-100"
                />
              </div>

              <div>
                <label>Balance</label>
                <input
                  value={(formData.balance || 0).toFixed(2)}
                  readOnly
                  className="border p-2 rounded w-full bg-gray-100"
                />
              </div>
            </div>

            {renderSchedule()}
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded-lg"
          >
          
            {submitting ? "Saving..." : "Add Customer"}
          </button>

        </form>
      </div>
    </BillingLayout>
  );
}

