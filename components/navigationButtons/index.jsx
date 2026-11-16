import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";

export default function NavigationButtons() {
  const router = useRouter();
  const historyStack = useRef([]);
  const currentIndex = useRef(-1);

  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  useEffect(() => {
    const handleRouteChange = (url) => {
      // Add new route to stack
      if (currentIndex.current === historyStack.current.length - 1) {
        historyStack.current.push(url);
        currentIndex.current++;
      } else {
        historyStack.current = historyStack.current.slice(
          0,
          currentIndex.current + 1,
        );
        historyStack.current.push(url);
        currentIndex.current++;
      }

      setCanGoBack(currentIndex.current > 0);
      setCanGoForward(currentIndex.current < historyStack.current.length - 1);
    };

    router.events.on("routeChangeComplete", handleRouteChange);

    // Initial setup
    handleRouteChange(router.asPath);

    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router]);

  const handleBack = () => {
    router.back();
    currentIndex.current = Math.max(0, currentIndex.current - 1);
    setCanGoBack(currentIndex.current > 0);
    setCanGoForward(true);
  };

  const handleForward = () => {
    router.forward?.();
    currentIndex.current = Math.min(
      historyStack.current.length - 1,
      currentIndex.current + 1,
    );
    setCanGoBack(currentIndex.current > 0);
    setCanGoForward(currentIndex.current < historyStack.current.length - 1);
  };

  return (
    <div className="flex items-center justify-end gap-2 mt-4">
      {canGoBack && (
        <button
          onClick={handleBack}
          className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          <FaArrowLeft className="mr-2" />
          Back
        </button>
      )}
      {canGoForward && (
        <button
          onClick={handleForward}
          className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          Forward
          <FaArrowRight className="ml-2" />
        </button>
      )}
    </div>
  );
}
