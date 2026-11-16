import dynamic from "next/dynamic";
import notFoundAnimation from "@/public/images/illustrations/404.json";

const EmptyState = dynamic(() => import("@/layouts/EmptyState/EmptyState"), {
  ssr: false,
});

export default function _404() {
  return (
    <EmptyState
      lottie={notFoundAnimation}
      title="404"
      subtitle="Page Not Found"
      button="Go back home"
    />
  );
}
