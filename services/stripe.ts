const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const createPaymentIntent = async (token: string, amount: number, metadata = {}) => {
  const res = await fetch(`${API_URL}/api/user/create-payment-intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      token,
    },
    body: JSON.stringify({ amount, metadata }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || 'Payment intent creation failed');
  }

  return data.data;
};

export const createCheckoutSession = async (
  token: string, 
  items: any[], 
  successUrl: string, 
  cancelUrl: string,
  metadata: any = {},
  addressId?: string
) => {
  const res = await fetch(`${API_URL}/api/user/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      token,
    },
    body: JSON.stringify({ 
      items, 
      successUrl, 
      cancelUrl, 
      metadata,
      addressId 
    }),
  });

  const data = await res.json();
  
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || 'Checkout session creation failed');
  }

  return data; 
};

export const verifyPayment = async (token: string, transactionId: string) => {
  const res = await fetch(`${API_URL}/api/user/verify-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      token,
    },
    body: JSON.stringify({
      transactionId,
    }),
  });

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(result.error?.[0]?.msg || 'Payment verification failed');
  }

  return result.data;
};

export const createStandardAccount = async (token: string, country: string = 'AE') => {
  const res = await fetch(`${API_URL}/api/user/create-standard-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      token,
    },
    body: JSON.stringify({ country }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || 'Account creation failed');
  }

  return data.data;
};

export const getAccountStatus = async (token: string) => {
  const res = await fetch(`${API_URL}/api/user/account-status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      token,
    },
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || 'Account status check failed');
  }

  return data.data;
};


export const continuePayment = async (token: string, orderId: number) => {
  const res = await fetch(`${API_URL}/api/order/continue-payment/${orderId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      token,
    },
  });

  const data = await res.json();
  
  if (!res.ok) {
    return { ok: false, error: data.error };
  }
  
  return { ok: true, ...data };
};

export const cancelOrder = async (token: string, orderId: number) => {
  const res = await fetch(`${API_URL}/api/order/cancel/${orderId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      token,
    },
  });

  const data = await res.json();
  
  if (!res.ok) {
    return { ok: false, error: data.error };
  }
  
  return { ok: true, ...data };
};