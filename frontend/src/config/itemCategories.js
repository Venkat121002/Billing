// Built-in per-industry Category → Product lists. These are only the
// starting defaults: each store can edit its own copy in Settings →
// Categories & Products (saved as owner.item_categories, see
// hooks/useItemCategories.js). Not validated server-side.
export const CATEGORY_DATA = {
  grocery: {
    "Food & Staples": ["Rice", "Wheat", "Atta", "Dals & Pulses", "Flour", "Sugar"],
    "Snacks & Packaged Foods": ["Chips", "Biscuits", "Namkeen", "Instant noodles", "Chocolates"],
    "Beverages": ["Soft drinks", "Juice", "Tea", "Coffee", "Energy drinks"],
    "Spices & Seasonings": ["Turmeric", "Chilli powder", "Masala", "Salt", "Pickle masala"],
    "Oils & Fats": ["Cooking oil", "Ghee", "Butter"],
    "Dairy Products": ["Milk", "Curd", "Paneer", "Cheese"],
    "Bakery Items": ["Bread", "Cakes", "Buns", "Rusk"],
    "Ready-to-Eat / Packaged": ["Pickles", "Sauces", "Jam", "Instant food"],
    "Household Items": ["Detergent", "Dishwash", "Floor cleaner", "Cleaning liquids"],
    "Personal Care": ["Shampoo", "Soap", "Toothpaste", "Face wash"],
    "Fruits & Vegetables": ["Fresh vegetables", "Fruits"],
    "Meat & Eggs": ["Eggs", "Chicken", "Meat"],
  },
  clothing: {
    "Men": ["Shirts", "T-Shirts", "Jeans", "Trousers", "Shorts", "Jackets", "Blazers", "Innerwear", "Ethnic Wear (Kurta, Sherwani)"],
    "Women": ["Sarees", "Kurtis / Kurtas", "Salwar Suits", "Tops", "Dresses", "Jeans & Leggings", "Skirts", "Nightwear", "Ethnic Wear (Lehenga, Gown)"],
    "Kids": ["Boys Wear", "Girls Wear", "Baby Wear (0–3 yrs)", "School Uniforms"],
    "Winter Wear": ["Sweaters", "Hoodies", "Jackets", "Shawls"],
    "Sports Wear": ["Track Pants", "Gym Wear", "Active T-Shirts", "Shorts"],
    "Accessories": ["Belts", "Caps", "Socks", "Handkerchiefs", "Scarves / Dupattas"],
  },
  pharmacy: {
    "Tablets": ["Painkiller", "Antibiotic", "Antacid", "Vitamin", "Anti-allergic", "Fever Reducer"],
    "Syrups": ["Cough Syrup", "Antacid Syrup", "Multivitamin Syrup", "Fever Syrup"],
    "Capsules": ["Antibiotic Capsule", "Vitamin Capsule", "Probiotic Capsule"],
    "Injections": ["Pain Relief Injection", "Antibiotic Injection", "Vaccine"],
    "Topical": ["Ointment", "Cream", "Gel", "Lotion", "Antiseptic Liquid"],
    "Vitamins & Supplements": ["Multivitamin", "Calcium", "Iron", "Protein Powder", "Omega-3"],
    "Pain Relief": ["Analgesic", "Anti-inflammatory", "Muscle Relaxant"],
    "Antibiotics": ["Broad-spectrum", "Narrow-spectrum", "Antifungal"],
    "Antacids": ["Liquid Antacid", "Tablet Antacid", "Gas Relief"],
    "Cough & Cold": ["Decongestant", "Expectorant", "Antihistamine", "Nasal Spray"],
    "First Aid": ["Bandage", "Antiseptic", "Cotton", "Gauze", "Adhesive Tape"],
    "Medical Devices": ["Thermometer", "BP Monitor", "Glucometer", "Nebulizer"],
    "Baby Care": ["Diapers", "Wipes", "Baby Lotion", "Baby Oil"],
    "Personal Hygiene": ["Sanitizer", "Soap", "Shampoo", "Toothpaste"],
    "Ayurvedic & Herbal": ["Chyawanprash", "Herbal Supplements", "Essential Oils"],
  },
  petshop: {
    "Pet Food": ["Dry Food", "Wet Food", "Puppy/Kitten Food", "Prescription Diet", "Bird Feed", "Fish Feed"],
    "Treats & Chews": ["Biscuits", "Dental Chews", "Rawhide", "Training Treats"],
    "Health & Wellness": ["Dewormer", "Flea & Tick Treatment", "Vitamins & Supplements", "Vaccines"],
    "Grooming Supplies": ["Shampoo", "Conditioner", "Brushes & Combs", "Nail Clippers"],
    "Toys": ["Chew Toys", "Balls", "Interactive Toys", "Scratching Posts"],
    "Bedding & Housing": ["Beds", "Crates & Cages", "Litter Boxes", "Aquariums"],
    "Leashes & Collars": ["Collars", "Leashes", "Harnesses", "ID Tags"],
    "Aquarium & Bird Supplies": ["Fish Tanks", "Filters", "Bird Cages", "Perches"],
  },
  mobile_shop: {
    "Mobile": [], "Bluetooth": [], "Charger": [], "Headset": [], "Cable": [],
  },
  academy: {
    "IT": [], "Spoken English": [], "Design": [], "Business": [], "Skill Development": [],
  },
  software_development: {
    "Web Development": [], "Mobile App": [], "UI/UX Design": [], "DevOps": [],
    "QA Testing": [], "Maintenance": [], "Consulting": [],
  },
};

/** Fresh copy of the built-in list for an industry profile key (grocery as the fallback). */
export const getDefaultCategories = (profileKey) =>
  structuredClone(CATEGORY_DATA[profileKey] || CATEGORY_DATA.grocery);

/** Standard clothing size options, used when the "Size" field (variants group) is shown. */
export const CLOTHING_SIZE_OPTIONS = [
  "XS (Extra Small)", "S (Small)", "M (Medium)", "L (Large)",
  "XL (Extra Large)", "XXL (Double XL)", "XXXL (Triple XL)",
];
