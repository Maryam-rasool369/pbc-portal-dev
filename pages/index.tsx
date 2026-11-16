import React from "react";
import SignIn from "@/components/auth/sign-in";
import AuthLayout from "@/layouts/AuthLayout";

const Home = () => {
  return <SignIn />;
};

Home.getLayout = (page: React.ReactNode) => (
  <AuthLayout heading="Login">{page}</AuthLayout>
);

export default Home;
