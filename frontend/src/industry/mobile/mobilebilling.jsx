import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Search,
  ShoppingCart,
  Trash2,
  ScanBarcode,
  IndianRupee,
  CreditCard,
  Smartphone,
} from "lucide-react";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import { useAuth } from "../../contexts/AuthContext";
import API_URL from "../../config/api";

const MobileBilling = () => {
  const { currentUser } = useAuth();

  const [mobiles, setMobiles] = useState([]);

  // =========================
  // LOAD MOBILES (PRODUCTS WITH AN IMEI) FROM BACKEND API
  // (Same REST endpoint every other screen uses — respects DB_TYPE:
  // MongoDB locally, Firestore in production. Do NOT read Firestore
  // directly here, or local dev would bypass the local database.)
  // =========================
  useEffect(() => {
    let retries = 0;
    const MAX_RETRIES = 10;

    const fetchMobiles = async () => {
      if (!currentUser) return;
      const token = sessionStorage.getItem("token");

      if (!token) {
        if (retries < MAX_RETRIES) {
          retries++;
          return setTimeout(fetchMobiles, 1000);
        }
        return;
      }

      try {
        const res = await axios.get(`${API_URL}/products`, {
          headers: { "x-auth-token": token },
        });
        // Mobiles are products tracked by IMEI (single-unit inventory)
        setMobiles(res.data.filter((p) => p.imei1));
      } catch (err) {
        if (retries < MAX_RETRIES) {
          retries++;
          console.warn(`Mobile inventory fetch attempt ${retries} failed, retrying...`);
          return setTimeout(fetchMobiles, 1000);
        }
        console.error("Failed to load mobile inventory:", err);
      }
    };

    fetchMobiles();
  }, [currentUser]);

  const [keyword, setKeyword] = useState("");
  const [cart, setCart] = useState([]);
  const [cash, setCash] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [barcodeInput, setBarcodeInput] = useState("");

  // =========================
  // ADD TO CART (IMEI BASED)
  // =========================
  const addToCart = (mobile) => {
    if (mobile.sold) {
      alert("This mobile is already sold!");
      return;
    }

    if (cart.find((item) => item.id === mobile.id)) {
      alert("Already added to cart!");
      return;
    }

    setCart([
      ...cart,
      {
        ...mobile,
        price: mobile.salePrice || 0,
      },
    ]);
  };

  // =========================
  // BARCODE SCAN (IMEI SCAN)
  // =========================
  const handleBarcodeScan = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const scanned = barcodeInput.trim();
      if (!scanned) return;

      const mobile = mobiles?.find(
        (m) =>
          (m.imei1 === scanned || m.imei2 === scanned) &&
          !m.sold
      );

      if (mobile) {
        addToCart(mobile);
      } else {
        alert("IMEI not found or already sold!");
      }

      setBarcodeInput("");
    }
  };

  const clearCart = () => setCart([]);

  const getTotal = () =>
    cart.reduce((sum, item) => sum + item.price, 0);

  const change = cash - getTotal();

  // =========================
  // COMPLETE SALE (via backend API — respects DB_TYPE)
  // =========================
  const completeSale = async () => {
    if (!currentUser) return;

    if (paymentMethod === "cash" && change < 0) {
      alert("Insufficient cash");
      return;
    }

    const token = sessionStorage.getItem("token");
    if (!token) {
      alert("Session expired. Please log in again.");
      return;
    }

    const config = { headers: { "x-auth-token": token } };

    try {
      await axios.post(
        `${API_URL}/billing/bills`,
        {
          items: cart,
          total: getTotal(),
          paymentMethod,
          createdAt: new Date().toISOString(),
        },
        config
      );

      // Mark sold mobiles
      const soldAt = new Date().toISOString();
      const stockUpdates = cart.map((item) =>
        axios
          .put(
            `${API_URL}/products/${item.id}`,
            { sold: true, soldAt },
            config
          )
          .catch((err) =>
            console.error(`Failed to mark ${item.brand} ${item.model} as sold:`, err)
          )
      );
      await Promise.all(stockUpdates);

      clearCart();
      setCash(0);
      alert("Mobile Sale Completed!");
    } catch (err) {
      console.error("Error completing sale:", err);
      alert(err.response?.data?.msg || "Failed to complete sale. Please try again.");
    }
  };

  const filteredMobiles =
    mobiles?.filter(
      (m) =>
        !m.sold &&
        (m.brand?.toLowerCase().includes(keyword.toLowerCase()) ||
          m.model?.toLowerCase().includes(keyword.toLowerCase()) ||
          m.imei1?.includes(keyword))
    ) || [];

  return (
    <BillingLayout hideHeader>
      <div className="flex h-screen bg-gray-50">

        {/* LEFT SIDE - MOBILE LIST */}
        <div className="w-1/2 border-r bg-white flex flex-col">

          {/* Search & IMEI Scan */}
          <div className="p-3 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search brand, model, IMEI..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full pl-9 h-10 border rounded-lg"
              />
            </div>

            <div className="relative">
              <ScanBarcode className="absolute left-3 top-3 text-blue-500" size={16} />
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeScan}
                placeholder="Scan IMEI..."
                className="w-full pl-9 h-10 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-400"
                autoFocus
              />
            </div>
          </div>

          {/* Mobile List */}
          <div className="flex-1 overflow-y-auto">
            {filteredMobiles.map((mobile) => (
              <div
                key={mobile.id}
                onClick={() => addToCart(mobile)}
                className="p-3 border-b cursor-pointer hover:bg-gray-50"
              >
                <div className="font-semibold">
                  {mobile.brand} {mobile.model}
                </div>
                <div className="text-sm text-gray-500">
                  IMEI: {mobile.imei1}
                </div>
                <div className="text-emerald-600 font-bold">
                  ₹{mobile.salePrice}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT SIDE - CART */}
        <div className="w-1/2 flex flex-col bg-white">

          <div className="p-3 border-b flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} />
              <span className="font-semibold">Mobile Cart</span>
            </div>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-red-500 flex items-center gap-1"
              >
                <Trash2 size={14} /> Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {cart.map((item) => (
              <div
                key={item.id}
                className="p-3 border-b flex justify-between"
              >
                <div>
                  <div className="font-semibold">
                    {item.brand} {item.model}
                  </div>
                  <div className="text-xs text-gray-500">
                    IMEI: {item.imei1}
                  </div>
                </div>
                <div className="font-bold text-emerald-600">
                  ₹{item.price}
                </div>
              </div>
            ))}
          </div>

          {/* Payment Section */}
          <div className="p-4 border-t space-y-3">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>₹{getTotal()}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPaymentMethod("cash")}
                className={`flex-1 p-2 border rounded ${
                  paymentMethod === "cash"
                    ? "bg-emerald-500 text-white"
                    : ""
                }`}
              >
                <IndianRupee size={16} /> Cash
              </button>
              <button
                onClick={() => setPaymentMethod("card")}
                className={`flex-1 p-2 border rounded ${
                  paymentMethod === "card"
                    ? "bg-blue-500 text-white"
                    : ""
                }`}
              >
                <CreditCard size={16} /> Card
              </button>
              <button
                onClick={() => setPaymentMethod("upi")}
                className={`flex-1 p-2 border rounded ${
                  paymentMethod === "upi"
                    ? "bg-purple-500 text-white"
                    : ""
                }`}
              >
                <Smartphone size={16} /> UPI
              </button>
            </div>

            {paymentMethod === "cash" && (
              <>
                <input
                  type="number"
                  placeholder="Cash received"
                  value={cash}
                  onChange={(e) => setCash(Number(e.target.value))}
                  className="w-full border rounded p-2"
                />
                <div className="flex justify-between">
                  <span>Change</span>
                  <span>₹{change >= 0 ? change : 0}</span>
                </div>
              </>
            )}

            <button
              onClick={completeSale}
              className="w-full bg-emerald-600 text-white p-3 rounded-lg font-bold"
            >
              Complete Sale
            </button>
          </div>
        </div>
      </div>
    </BillingLayout>
  );
};

export default MobileBilling;
