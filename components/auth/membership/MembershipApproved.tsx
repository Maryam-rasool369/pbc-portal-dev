import ApplicationCompletedSVG from "@/assets/icons/ApplicationCompletedSVG";
import { useRouter } from "next/router";
import React from "react";

const MembershipApproved = () => {
  const router = useRouter();
  return (
    <div className=" flex items-center justify-center px-4">
      <div className="rounded-2xl p-8 max-w-md w-full text-center space-y-6 animate-fade-in">
        <div className="w-24 h-24 mx-auto">
          <ApplicationCompletedSVG />
        </div>
        <h1 className="text-2xl font-semibold text-gold-400">
          Membership Approved!
        </h1>
        <p className="text-white">
          Congratulations! Your membership application has been approved. Please
          proceed with the payment.
        </p>
        <div className="pt-4">
          <button
            className="bg-gold-500 hover:bg-gold-600 text-white font-medium px-6 py-2 rounded-full transition duration-300"
            onClick={() => router.push("/authentication/payment-pending")}
          >
            Proceed to Payment
          </button>
        </div>
      </div>
    </div>
  );
};

export default MembershipApproved;
