import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import API_URL from "../config/api";
import { resolveIndustryProfile } from "../config/industryProfiles";
import { getDefaultCategories } from "../config/itemCategories";

/**
 * The store's Category → Product list ({ [category]: [product, ...] }).
 * Loaded from the owner record; until the owner saves their own list this
 * returns the built-in industry defaults. Only owners can `save` (the
 * backend rejects sub-users).
 */
export default function useItemCategories(currentUser) {
  const profileKey = resolveIndustryProfile(currentUser).key;
  const [categories, setCategories] = useState(() => getDefaultCategories(profileKey));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const token = sessionStorage.getItem("token");
    if (!currentUser || !token) {
      setLoading(false);
      return;
    }
    axios
      .get(`${API_URL}/auth/item-categories`, { headers: { "x-auth-token": token } })
      .then((res) => {
        if (!cancelled) setCategories(res.data?.categories || getDefaultCategories(profileKey));
      })
      .catch((err) => console.error("Error fetching item categories:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser, profileKey]);

  const save = useCallback(async (next) => {
    const token = sessionStorage.getItem("token");
    const res = await axios.put(
      `${API_URL}/auth/item-categories`,
      { categories: next },
      { headers: { "x-auth-token": token } }
    );
    setCategories(res.data.categories);
    return res.data.categories;
  }, []);

  return { categories, loading, save };
}
