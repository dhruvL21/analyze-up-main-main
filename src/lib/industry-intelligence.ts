import { BusinessType } from './types';

export interface IndustryConfig {
  type: BusinessType;
  label: string;
  defaultUnit: string;
  focusAreas: string[];
  aiPriority: string;
  benchmarkMargin: string;
  suggestedCategories: string[];
}

export const INDUSTRY_CONFIGS: Record<BusinessType, IndustryConfig> = {
  Restaurant: {
    type: 'Restaurant',
    label: 'Restaurant & Dining',
    defaultUnit: 'Kg',
    focusAreas: ['Ingredients', 'Spoilage & Food Waste', 'Recipe Costing', 'Daily Consumption'],
    aiPriority: 'Prioritize tracking high-perishable ingredients, batch expiry dates, and daily stock consumption to prevent kitchen waste.',
    benchmarkMargin: '60% - 70%',
    suggestedCategories: ['Fresh Produce', 'Dairy & Eggs', 'Meats & Seafood', 'Beverages', 'Spices & Pantry', 'Packaging'],
  },
  Cafe: {
    type: 'Cafe',
    label: 'Cafe & Coffee Shop',
    defaultUnit: 'Gram',
    focusAreas: ['Coffee Beans & Dairy', 'Bakery Freshness', 'Cup & Packaging Stock', 'Peak Hours Sales'],
    aiPriority: 'Focus on milk & coffee bean daily usage rates, pastry batch expiry, and takeaway packaging inventory.',
    benchmarkMargin: '65% - 75%',
    suggestedCategories: ['Coffee Beans', 'Dairy & Milk Alternatives', 'Syrups & Flavors', 'Pastries & Bakery', 'Paper Cups & Packaging'],
  },
  Fashion: {
    type: 'Fashion',
    label: 'Fashion & Apparel',
    defaultUnit: 'Piece',
    focusAreas: ['Seasonal Demand', 'Size & Color Variants', 'Slow-Moving Styles', 'Vendor Lead Times'],
    aiPriority: 'Focus on seasonal inventory cycles, size/color variant velocity, and clearing old season stock before dead stock accrues.',
    benchmarkMargin: '45% - 60%',
    suggestedCategories: ['Tops & Shirts', 'Bottoms & Denim', 'Outerwear', 'Footwear', 'Accessories', 'Activewear'],
  },
  Beauty: {
    type: 'Beauty',
    label: 'Beauty & Cosmetics',
    defaultUnit: 'Bottle',
    focusAreas: ['Batch Expiry', 'Sample Stock', 'Reorder Triggers', 'High Margin Best-Sellers'],
    aiPriority: 'Focus on batch tracking, expiration management for skincare products, and automated replenishment for top cosmetics.',
    benchmarkMargin: '50% - 70%',
    suggestedCategories: ['Skincare', 'Makeup', 'Haircare', 'Fragrance', 'Tools & Brushes', 'Bath & Body'],
  },
  Electronics: {
    type: 'Electronics',
    label: 'Consumer Electronics',
    defaultUnit: 'Piece',
    focusAreas: ['Warranty Tracking', 'Serial Numbers', 'High Unit Cost Risk', 'Accessory Bundles'],
    aiPriority: 'Prioritize high capital lockup in slow-moving gadgets, accessory cross-selling bundles, and warranty/serial tracking.',
    benchmarkMargin: '20% - 35%',
    suggestedCategories: ['Smartphones & Accessories', 'Audio & Headphones', 'Computers & Laptops', 'Smart Home', 'Wearables', 'Cables & Power'],
  },
  Medical: {
    type: 'Medical',
    label: 'Pharmacy & Medical Supplies',
    defaultUnit: 'Box',
    focusAreas: ['Prescription Compliance', 'Expiration Dates', 'Critical Stock Levels', 'Supplier Reliability'],
    aiPriority: 'Strict focus on batch expiration tracking, safety stock levels for life-saving medicine, and supplier delivery speed.',
    benchmarkMargin: '25% - 40%',
    suggestedCategories: ['OTC Medicines', 'Prescription Drugs', 'First Aid & Bandages', 'Diagnostic Tools', 'Personal Care', 'Supplements'],
  },
  Retail: {
    type: 'Retail',
    label: 'General Retail Store',
    defaultUnit: 'Piece',
    focusAreas: ['Fast-Moving Turnover', 'Shelf Space Optimization', 'Supplier Performance', 'Promotional Discounting'],
    aiPriority: 'Prioritize identifying fast-moving cash cows, eliminating dead stock, and optimizing reorder thresholds.',
    benchmarkMargin: '30% - 50%',
    suggestedCategories: ['Home Goods', 'Personal Care', 'Snacks & Drinks', 'Stationery', 'Novelties', 'Seasonal'],
  },
  Wholesale: {
    type: 'Wholesale',
    label: 'Wholesale Distribution',
    defaultUnit: 'Box',
    focusAreas: ['Bulk Order Minimums', 'Tiered Pricing', 'Pallet Inventory', 'Credit & Payments'],
    aiPriority: 'Focus on bulk turnover rate, supplier volume discounts, order fulfillment speed, and inventory lead times.',
    benchmarkMargin: '15% - 25%',
    suggestedCategories: ['Bulk Fast Moving Items', 'Commercial Supplies', 'Packaging Materials', 'Industrial Consumables'],
  },
  Manufacturing: {
    type: 'Manufacturing',
    label: 'Light Manufacturing',
    defaultUnit: 'Set',
    focusAreas: ['Raw Material Ratio', 'Work in Progress', 'Finished Goods Yield', 'Component Shortages'],
    aiPriority: 'Track raw material to finished goods ratios, prevent assembly line bottlenecks, and manage BOM reorder points.',
    benchmarkMargin: '35% - 50%',
    suggestedCategories: ['Raw Materials', 'Components & Parts', 'Packaging', 'Finished Goods', 'Consumables'],
  },
  Hardware: {
    type: 'Hardware',
    label: 'Hardware & Tools',
    defaultUnit: 'Piece',
    focusAreas: ['Heavy Freight Lead Times', 'Tool Warranty', 'Fastener SKUs', 'Contractor Pricing'],
    aiPriority: 'Focus on high-turnover tools, stocking essential fasteners, and managing long lead times for imported machinery.',
    benchmarkMargin: '30% - 45%',
    suggestedCategories: ['Hand Tools', 'Power Tools', 'Fasteners & Screws', 'Plumbing', 'Electrical', 'Safety Gear'],
  },
  Automotive: {
    type: 'Automotive',
    label: 'Automotive Parts & Accessories',
    defaultUnit: 'Piece',
    focusAreas: ['Vehicle Model Compatibility', 'OEM vs Aftermarket', 'High-Cost Parts Risk', 'Oil & Fluid Expiry'],
    aiPriority: 'Focus on fast-moving wear-and-tear parts (filters, brake pads), vehicle compatibility indexing, and supplier lead times.',
    benchmarkMargin: '25% - 40%',
    suggestedCategories: ['Braking & Suspension', 'Filters & Fluids', 'Electrical & Batteries', 'Car Care & Cleaning', 'Tires & Wheels'],
  },
  Sports: {
    type: 'Sports',
    label: 'Sports & Outdoors',
    defaultUnit: 'Piece',
    focusAreas: ['Seasonal Sports Gear', 'Equipment Care', 'Apparel Sizes', 'High Margin Accessories'],
    aiPriority: 'Track summer vs winter sport cycles, equipment bundle promotions, and high-margin fitness accessories.',
    benchmarkMargin: '40% - 55%',
    suggestedCategories: ['Fitness & Gym', 'Outdoor & Camping', 'Team Sports', 'Water Sports', 'Footwear & Apparel'],
  },
  Books: {
    type: 'Books',
    label: 'Bookstore & Stationery',
    defaultUnit: 'Piece',
    focusAreas: ['Bestseller Velocity', 'Publisher Returns', 'Category Diversity', 'Stationery Bundles'],
    aiPriority: 'Track bestseller sell-through rates, publisher return windows, and high-margin gift/stationery cross-sales.',
    benchmarkMargin: '35% - 45%',
    suggestedCategories: ['Fiction', 'Non-Fiction', 'Children & YA', 'Academic & Professional', 'Notebooks & Pens', 'Gifts'],
  },
  Furniture: {
    type: 'Furniture',
    label: 'Furniture & Home Decor',
    defaultUnit: 'Set',
    focusAreas: ['Warehouse Holding Cost', 'Custom Order Status', 'Damage & Returns', 'Floor Display Turnover'],
    aiPriority: 'Focus on minimizing high warehouse storage costs for slow furniture, managing pre-orders, and damage inspections.',
    benchmarkMargin: '45% - 60%',
    suggestedCategories: ['Living Room', 'Bedroom', 'Office', 'Dining', 'Lighting & Decor', 'Outdoor Furniture'],
  },
  Other: {
    type: 'Other',
    label: 'General Business',
    defaultUnit: 'Piece',
    focusAreas: ['Inventory Health', 'Profit Margins', 'Supplier Performance', 'Reorder Triggers'],
    aiPriority: 'Focus on cash flow optimization, low stock alert monitoring, and dead stock reduction.',
    benchmarkMargin: '30% - 50%',
    suggestedCategories: ['Main Products', 'Secondary Products', 'Supplies', 'Accessories'],
  },
  Ecommerce: {
    type: 'Ecommerce',
    label: 'Ecommerce & Online',
    defaultUnit: 'Item',
    focusAreas: ['Shipping Velocity', 'Return Rate', 'Cart Conversion', 'Supplier Fulfillment'],
    aiPriority: 'Focus on fast order fulfillment, customer return mitigation, and supplier lead times.',
    benchmarkMargin: '40% - 60%',
    suggestedCategories: ['Best Sellers', 'New Arrivals', 'Clearance', 'Bundles'],
  },
  D2C: {
    type: 'D2C',
    label: 'Direct to Consumer',
    defaultUnit: 'Item',
    focusAreas: ['Brand Margins', 'Customer Lifetime Value', 'Repeat Purchases', 'Batch Stocking'],
    aiPriority: 'Focus on maintaining healthy direct margins and tracking reorder points for hero SKUs.',
    benchmarkMargin: '50% - 70%',
    suggestedCategories: ['Hero Products', 'Subscriptions', 'Bundles', 'Limited Edition'],
  },
  'General Business': {
    type: 'General Business',
    label: 'General Business',
    defaultUnit: 'Piece',
    focusAreas: ['Inventory Health', 'Profit Margins', 'Supplier Performance', 'Reorder Triggers'],
    aiPriority: 'Focus on cash flow optimization, low stock alert monitoring, and dead stock reduction.',
    benchmarkMargin: '30% - 50%',
    suggestedCategories: ['Main Products', 'Secondary Products', 'Supplies', 'Accessories'],
  },
};

export function getIndustryConfig(businessType?: string): IndustryConfig {
  if (businessType && businessType in INDUSTRY_CONFIGS) {
    return INDUSTRY_CONFIGS[businessType as BusinessType];
  }
  return INDUSTRY_CONFIGS.Retail;
}
