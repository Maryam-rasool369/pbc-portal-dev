import axios from "axios";

export const initializeFoloosiPayment = async (paymentData: any) => {
  const res = await axios.post(
    "https://api.foloosi.com/aggregatorapi/web/initialize-setup",
    paymentData,
    {
      headers: {
        "Content-Type": "application/json",
        merchant_key: process.env.NEXT_PUBLIC_FOLOOSI_MERCHANT_KEY,
      },
    },
  );

  return res.data.data.reference_token;
};
