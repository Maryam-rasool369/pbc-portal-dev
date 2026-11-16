import ApplicationCompletedSVG from "@/assets/icons/ApplicationCompletedSVG";
import { useRouter } from "next/router";
import React from "react";

const MembershipCompletion = () => {
  const router = useRouter();
  return (
    <div className=" flex items-center justify-center px-4">
      <div className="rounded-2xl p-8 max-w-md w-full text-center space-y-6 animate-fade-in">
        <div className="w-24 h-24 mx-auto">
          <ApplicationCompletedSVG />
        </div>
        <h1 className="text-2xl font-semibold text-gold-400">
          Application Submitted Successfully
        </h1>
        <p className="text-white">
          We will keep you posted about your application. It’s currently under
          review.
        </p>
      </div>
    </div>
  );
};

export default MembershipCompletion;
