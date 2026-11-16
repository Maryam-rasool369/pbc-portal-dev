import React, { useEffect } from "react";
import Head from "next/head";
import Link from "next/link";

const APP_STORE_URL =
  "https://apps.apple.com/pk/app/pakistan-business-council-dxb/id6747267527";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=ae.pbcdubai.admin&pcampaignid=web_share";

export default function OpenAppContent() {
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || "";
    const isIos =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /android/i.test(ua);

    if (isIos) {
      window.location.href = APP_STORE_URL;
    } else if (isAndroid) {
      window.location.href = PLAY_STORE_URL;
    }
  }, []);

  return (
    <>
      <Head>
        <title>Open PBC App</title>
      </Head>

      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-6">
        <Link href="/" className="text-gold-400 hover:underline text-sm">
          Return to portal
        </Link>
      </div>
    </>
  );
}
