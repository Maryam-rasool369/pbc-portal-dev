import { useLoadingStore } from "@/store/useLoadingStore";

export function Loader() {
  const isLoading = useLoadingStore((state) => state.isLoading);

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50">
      <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
