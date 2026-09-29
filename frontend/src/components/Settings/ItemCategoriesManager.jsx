import React, { useEffect, useState } from "react";
import { Tags, X, Plus, Trash2, Pencil, Check, RotateCcw, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { getDefaultCategories } from "../../config/itemCategories";

const inputClass =
  "w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all text-gray-900";

// Mirrors the backend rule in firestoreAuthController.sanitizeItemCategories.
const invalidName = (name) => name.includes(".") || name.startsWith("$");

const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

// A list row that can switch into an inline rename box.
const EditableRow = ({ name, active, count, onSelect, onRename, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const commit = () => {
    if (onRename(draft.trim())) setEditing(false);
  };

  if (editing) {
    return (
      <li className="flex items-center gap-1.5 p-1">
        <input
          autoFocus
          value={draft}
          maxLength={100}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setDraft(name); setEditing(false); }
          }}
          className={inputClass}
        />
        <button onClick={commit} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Save name">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={() => { setDraft(name); setEditing(false); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg" title="Cancel">
          <X className="w-4 h-4" />
        </button>
      </li>
    );
  }

  return (
    <li
      onClick={onSelect}
      className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${onSelect ? "cursor-pointer" : ""} ${
        active ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      <span className="flex-1 truncate">{name}</span>
      {count !== undefined && <span className="text-[11px] text-gray-400">{count}</span>}
      <button
        onClick={(e) => { e.stopPropagation(); setDraft(name); setEditing(true); }}
        className="p-1 text-gray-400 hover:text-emerald-600 opacity-60 group-hover:opacity-100"
        title="Rename"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="p-1 text-gray-400 hover:text-red-500 opacity-60 group-hover:opacity-100"
        title="Delete"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      {count !== undefined && <ChevronRight className={`w-4 h-4 ${active ? "text-emerald-500" : "text-gray-300"}`} />}
    </li>
  );
};

const AddBox = ({ placeholder, onAdd }) => {
  const [value, setValue] = useState("");
  const submit = () => {
    if (onAdd(value.trim())) setValue("");
  };
  return (
    <div className="flex gap-2">
      <input
        value={value}
        maxLength={100}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={placeholder}
        className={inputClass}
      />
      <button
        onClick={submit}
        disabled={!value.trim()}
        className="flex items-center gap-1 px-3 h-9 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
      >
        <Plus className="w-3.5 h-3.5" /> Add
      </button>
    </div>
  );
};

/**
 * Settings → Categories & Products. Edits a draft copy of the store's list
 * and saves it in one go. Owners only (the Settings row is hidden for
 * sub-users and the API rejects them).
 */
const ItemCategoriesManager = ({ categories, onSave, profileKey, onClose }) => {
  const [draft, setDraft] = useState(categories);
  const [selected, setSelected] = useState(() => Object.keys(categories).sort()[0] || null);
  const [saving, setSaving] = useState(false);

  // Pick up the server copy once it finishes loading.
  useEffect(() => {
    setDraft(categories);
    setSelected((prev) => (prev && categories[prev] ? prev : Object.keys(categories).sort()[0] || null));
  }, [categories]);

  const names = Object.keys(draft).sort((a, b) => a.localeCompare(b));
  const products = selected ? [...(draft[selected] || [])].sort((a, b) => a.localeCompare(b)) : [];
  const dirty = JSON.stringify(draft) !== JSON.stringify(categories);

  const validate = (name, existing, current) => {
    if (!name) return false;
    if (invalidName(name)) {
      toast.error("Names can't contain '.' or start with '$'.");
      return false;
    }
    if (existing.some((n) => n !== current && sameName(n, name))) {
      toast.error(`"${name}" already exists.`);
      return false;
    }
    return true;
  };

  const addCategory = (name) => {
    if (!validate(name, names)) return false;
    setDraft((d) => ({ ...d, [name]: [] }));
    setSelected(name);
    return true;
  };

  const renameCategory = (oldName, newName) => {
    if (newName === oldName) return true;
    if (!validate(newName, names, oldName)) return false;
    setDraft((d) => {
      const next = {};
      Object.entries(d).forEach(([k, v]) => { next[k === oldName ? newName : k] = v; });
      return next;
    });
    if (selected === oldName) setSelected(newName);
    return true;
  };

  const deleteCategory = (name) => {
    const count = draft[name]?.length || 0;
    if (!window.confirm(`Delete category "${name}"${count ? ` and its ${count} product(s)` : ""}? Existing items keep their saved category.`)) return;
    setDraft((d) => {
      const { [name]: _, ...rest } = d;
      return rest;
    });
    if (selected === name) setSelected(names.find((n) => n !== name) || null);
  };

  const setProducts = (fn) => setDraft((d) => ({ ...d, [selected]: fn(d[selected] || []) }));

  const addProduct = (name) => {
    if (!validate(name, products)) return false;
    setProducts((list) => [...list, name]);
    return true;
  };

  const renameProduct = (oldName, newName) => {
    if (newName === oldName) return true;
    if (!validate(newName, products, oldName)) return false;
    setProducts((list) => list.map((p) => (p === oldName ? newName : p)));
    return true;
  };

  const deleteProduct = (name) => setProducts((list) => list.filter((p) => p !== name));

  const resetToDefaults = () => {
    if (!window.confirm("Replace your list with the built-in defaults for your industry? Unsaved changes will be lost.")) return;
    const defaults = getDefaultCategories(profileKey);
    setDraft(defaults);
    setSelected(Object.keys(defaults).sort()[0] || null);
  };

  const save = async () => {
    try {
      setSaving(true);
      await onSave(draft);
      toast.success("Categories saved!");
    } catch (err) {
      console.error("Save item categories failed:", err);
      toast.error(err.response?.data?.msg || "Failed to save categories.");
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    onClose();
  };

  return (
    <div className="p-5 md:p-6">
      <div className="flex justify-between items-center mb-2 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
            <Tags className="w-4 h-4 text-orange-600" />
          </div>
          <h2 className="text-sm font-bold text-gray-900">Categories &amp; Products</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            title="Replace with the built-in industry list"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Defaults
          </button>
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="text-xs font-semibold text-white bg-emerald-600 px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={close} className="text-gray-400 hover:text-gray-600 transition-colors ml-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-5">
        These lists fill the Category and Product dropdowns on Add Product.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Categories ({names.length})
          </h3>
          <AddBox placeholder="New category" onAdd={addCategory} />
          <ul className="mt-3 space-y-0.5 max-h-80 overflow-y-auto">
            {names.map((name) => (
              <EditableRow
                key={name}
                name={name}
                active={name === selected}
                count={draft[name].length}
                onSelect={() => setSelected(name)}
                onRename={(n) => renameCategory(name, n)}
                onDelete={() => deleteCategory(name)}
              />
            ))}
            {names.length === 0 && <li className="text-xs text-gray-400 px-3 py-4">No categories yet — add one above.</li>}
          </ul>
        </div>

        <div className="md:border-l md:border-gray-100 md:pl-5">
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 truncate">
            {selected ? `Products in ${selected} (${products.length})` : "Products"}
          </h3>
          {selected ? (
            <>
              <AddBox placeholder="New product" onAdd={addProduct} />
              <ul className="mt-3 space-y-0.5 max-h-80 overflow-y-auto">
                {products.map((name) => (
                  <EditableRow
                    key={name}
                    name={name}
                    onRename={(n) => renameProduct(name, n)}
                    onDelete={() => deleteProduct(name)}
                  />
                ))}
                {products.length === 0 && <li className="text-xs text-gray-400 px-3 py-4">No products in this category yet.</li>}
              </ul>
            </>
          ) : (
            <p className="text-xs text-gray-400 py-4">Select a category to manage its products.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemCategoriesManager;
