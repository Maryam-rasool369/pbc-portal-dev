export type RFQ = {
  quantity: number;
  budget: number;
  id: number;
  title: string;
  description: string;
  deadline: string;
  status: string;
  categoryName: string;
  userId: number;
  count: number;
};

export type Wishlist = {
  user: {
    id: number;
    name: string;
  };
  id: number;
  title: string;
  status: string;
};

export type Product = {
  id: number;
  name: string;
  brand?: string;
  description: string;
  categoryId?: string | number;
  primaryImage: string | null;
  secondaryImage: string | null;
  tertiaryImage?: string | null;
  variants?: {
    id: number;
    price: number;
    stockQuantity: number;
    isDefault: boolean;
    sku?: string;
  }[];

  // Legacy fallback for incomplete list payloads.
  price?: string | number;
};

export type JobPost = {
  id: number;
  title: string;
  description: string;
  deadline: string;
  status: string;
};

export type Lead = {
  status: string;
  Seller: {
    id: number;
    name: string;
  };
  Buyer: {
    id: number;
    name: string;
  };
  Product: {
    id: number;
    name: string;
  };
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  profilePicture: string | null;
  company: string | null;
  location: string | null;
  isActive: boolean;
  createdAt: string;
};

export type Profile = {
  country: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  id: number;
  userId: number;
  name: string;
  email: string;
  phoneNumber: string;
  profilePicture: string | null;
  company: string | null;
  location: string | null;
  isActive: boolean;
  createdAt: string;
};

export type Election = {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  type: string;
};

export type EventType = {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  eventMOMStatus: string;
  details: string;
};

export type Ticket = {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  priority: string;
};
