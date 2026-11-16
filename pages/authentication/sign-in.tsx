import React from "react";
import AuthLayout from "@/layouts/AuthLayout";
import SignIn from "@/components/auth/sign-in";
import Head from "next/head";

export default function SignInPage() {
  return (
    <>
      <Head>
        <title>Sign In | PBC Portal</title>
        <meta name="description" content="Sign in to your PBC Portal account" />
      </Head>
      <AuthLayout heading="Sign In to Your Account">
        <SignIn />
      </AuthLayout>
    </>
  );
}
