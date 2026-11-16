import { useCallback, useState } from "react";

const useFileDownloader = () => {
    const [loading, setLoading] = useState(false);

    const downloadFile = useCallback(async (src: string, title: string = "image.jpg"): Promise<void> => {
        setLoading(true);
        try {
            const response: Response = await fetch(src, { mode: "cors" });
            const blob: Blob = await response.blob();
            const url: string = window.URL.createObjectURL(blob);

            const a: HTMLAnchorElement = document.createElement("a");
            a.href = url;
            a.download = title;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    return { downloadFile, loading };
};

export default useFileDownloader;
