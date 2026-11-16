export interface OrderItem {
  productId: number;
  productName: string;
  seller: string;
  sellerId: number;
  price: number;
  productImage: string;
}

export interface Order {
  id: number;
  userId: number;
  items: OrderItem[];
  originalPrice: number;
  discountedPrice: number;
  addressId: number;
  transactionId: string;
  isDiscountApplied: boolean;
  discountValue: number;
  stripePaymentIntentId?: string | null;
  stripeSessionId?: string | null;
  paymentStatus?: string;
  transactionStatus?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  address?: {
    id: number;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    country: string;
    zipCode: string;
  };
  buyer?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface OrderResponse {
  message: string;
  data: Order[];
  error?: { msg: string; path?: string }[];
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface PaginatedOrderResponse {
  message: string;
  data: Order[];
  pagination: PaginationMeta;
  error?: { msg: string; path?: string }[];
} 