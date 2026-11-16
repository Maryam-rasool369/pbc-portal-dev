// types/marketplace.ts

import type { GeneralResponse } from "./global";

export interface Product {
  id: number;
  userId: number;
  name: string;
  brand: string;
  description: string;
  primaryImage: string;
  secondaryImage?: string;
  tertiaryImage?: string;
  categoryId: number;
  category: {
    id: number;
    name: string;
  };
  user: {
    id: number;
    name: string;
    profile?: {
      profilePicture?: string | null;
    };
  };
  variants?: ProductVariant[];
  responses?: GeneralResponse[];

  // Legacy fallbacks kept optional for compatibility during migration.
  price?: string | number;
  image?: string;
  createdAt: string;
}

export interface ProductVariant {
  id: number;
  productId?: number;
  sku?: string;
  price: number;
  stockQuantity: number;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  attributes?: Record<string, string>;
  isDefault: boolean;
}

export interface ProductWanted {
  id: number;
  userId: number;
  name: string;
  description: string;
  quantity: number;
  primaryImage?: string;
  secondaryImage?: string;
  categoryId: number;
  category: {
    id: number;
    name: string;
  };
  user: {
    id: number;
    name: string;
    profile?: {
      profilePicture?: string | null;
    };
  };
  createdAt: string;
  updatedAt: string;
  responses?: GeneralResponse[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface ServiceCategory {
  id: number;
  name: string;
  description?: string;
  subCategories?: { id: number; name: string }[];
}
export interface User {
  id: number;
  name: string;
}

export interface Quote {
  id: number;
  rfqId: number;
  userId: number;
  price: number;
  description: string;
  timeline: string;
  primaryImage: string | null;
  secondaryImage: string | null;
  termsAndConditions: string;
  createdAt: string;
  updatedAt: string;
  isAwarded: boolean;
  user: User;
  responses: QouteResponse[];
}

export interface NewQuoteData {
  price: number | null;
  description: string;
  timeline: string;
  termsAndConditions: string;
  primaryImage?: File;
  secondaryImage?: File;
}

export interface RFQ {
  id: number;
  userId: number;
  title: string;
  categoryName: string;
  quantity: number;
  budget: number;
  deadline: string;
  description: string;
  primaryImage: string | null;
  secondaryImage: string | null;
  status: "OPEN" | "CLOSED" | "AWARDED";
  createdAt: string;
  updatedAt: string;
  awardedQuoteId: number | null;
  quotes: Quote[];
  productId?: number;
  product?: {
    id: number;
    name: string;
    brand?: string;
    description: string;
    primaryImage: string;
    secondaryImage?: string;
    userId: number;
    categoryId: number;
    variants?: ProductVariant[];

    // Legacy fallback for older RFQ payloads.
    price?: number;
  };
}

interface QouteResponse {
  id: string;
  response: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
    Role: {
      id: number;
      name: string;
    };
  };
}

interface QouteResponse {
  id: string;
  response: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
    Role: {
      id: number;
      name: string;
    };
  };
}

export interface Order {
  id: number;
  orderNumber: string;
  total: string;
  status: string;
  date: string;
  image: string;
  items?: number;
}

export interface CartItem {
  productId: number;
  productName: string;
  productImage: string;
  price: number;
  seller: string;
  sellerId: number;
}

export interface Cart {
  id: number;
  userId: number;
  items: CartItem[];
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface Discount {
  id: number;
  title: string;
  description: string;
  value: number;
  discountCode: string;
  startDate: string;
  validUntil: string;
  isFeatured: boolean;
  date: string;
}

export interface Service {
  id: number;
  userId: number;
  name: string;
  brand: string;
  description: string;
  primaryImage?: string | null;
  serviceCategoryId: number;
  serviceCategory: {
    id: number;
    name: string;
  };
  subCategoryId?: number | null;
  subCategory?: {
    id: number;
    name: string;
  } | null;
  user: {
    id: number;
    name: string;
    profile?: {
      profilePicture?: string | null;
    };
  };
  createdAt: string;
  responses?: GeneralResponse[];
}

export interface ServiceWanted {
  id: number;
  userId: number;
  name: string;
  description: string;
  image?: string | null;
  serviceCategoryId: number;
  serviceCategory: {
    id: number;
    name: string;
  };
  subCategoryId: number;
  subCategory: {
    id: number;
    name: string;
  };
  user: {
    id: number;
    name: string;
    profile?: {
      profilePicture?: string | null;
    };
  };
  createdAt: string;
  updatedAt: string;
  responses?: GeneralResponse[];
}

export interface ServiceQuote {
  id: number;
  serviceRfqId: number;
  userId: number;
  price: number;
  description: string;
  timeline: string;
  primaryImage: string | null;
  secondaryImage: string | null;
  termsAndConditions: string;
  createdAt: string;
  updatedAt: string;
  isAwarded: boolean;
  user: User;
  responses: QouteResponse[];
}

export interface NewServiceQuoteData {
  price: number | null;
  description: string;
  timeline: string;
  termsAndConditions: string;
  primaryImage?: File;
  secondaryImage?: File;
}

export interface ServiceRFQ {
  id: number;
  userId: number;
  title: string;
  serviceCategoryId: number;
  serviceCategory?: { id: number; name: string };
  subCategoryId: number;
  subCategory?: { id: number; name: string };
  serviceId?: number | null;
  service?: { id: number; name: string } | null;
  budget: number;
  deadline: string;
  description: string;
  primaryImage: string | null;
  secondaryImage: string | null;
  status: "OPEN" | "CLOSED" | "AWARDED";
  createdAt: string;
  updatedAt: string;
  awardedServiceQuoteId?: number | null;
  serviceQuotes: ServiceQuote[];
}

export type TabData = {
  product: Product[];
  rfq: RFQ[];
  serviceRfq: ServiceRFQ[];
  order: Order[];
  discount: Discount[];
  cart: Cart[];
  service: Service[];
};

export type Pagination = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};


