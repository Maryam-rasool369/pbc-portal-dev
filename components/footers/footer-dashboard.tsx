import React from "react";
import Link from "next/link";

export default function FooterDashboard() {
  const now = new Date();

  const [month, day, year] = [now.getMonth(), now.getDate(), now.getFullYear()];

  const [hour, minutes, seconds] = [
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  ];

  return (
    <>
      <footer className="my-10 text-sm text-center text-gray-500">
        &copy; {year}{" "}
        <Link
          href="https://pbcdubai.ae/"
          className="hover:underline hover:text-gold-500"
        >
          PBC Dubai
        </Link>{" "}
        All rights reserved.
      </footer>
    </>
  );
}
