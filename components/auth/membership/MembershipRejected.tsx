import ApplicationCompletedSVG from "@/assets/icons/ApplicationCompletedSVG";
import { useRouter } from "next/router";
import React from "react";
import useAuthStore from "@/store/authStore";

interface Props {
  rejectionReasons?: string[];
}

const MembershipRejected = ({ rejectionReasons = [] }: Props) => {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  return (
    <div className=" flex items-center justify-center px-4">
      <div className="rounded-2xl p-8 max-w-md w-full text-center space-y-6 animate-fade-in">
        <div className="w-24 h-24 mx-auto">
          <ApplicationCompletedSVG />
        </div>
        <h1 className="text-2xl font-semibold text-gold-400">
          Membership Rejected!
        </h1>
        <p className="text-white">
          Your application was not approved from our directors. If you think
          there’s an issue, you can apply again.
        </p>
        {rejectionReasons.length > 0 && (
          <div className="text-left bg-red-950/30 border border-red-700 rounded-xl p-4">
            <h2 className="text-red-300 font-semibold mb-2">Rejection Reasons</h2>
            <ul className="list-disc list-inside text-sm text-red-100 space-y-1">
              {rejectionReasons.map((reason, index) => (
                <li key={`${reason}-${index}`}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-row pt-4 gap-x-2">
          <button
            className="bg-gold-500 hover:bg-gold-600 text-white font-medium px-6 py-2 rounded-full transition duration-300"
            onClick={() => router.push("/authentication/membership?step=1")}
          >
            Apply Again
          </button>
          <button
            className="bg-gold-500 hover:bg-gold-600 text-white font-medium px-6 py-2 rounded-full transition duration-300"
            onClick={() => {
              logout();
              localStorage.clear();
              sessionStorage.clear();
              router.push("/authentication/sign-in");
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default MembershipRejected;
