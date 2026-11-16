import dynamic from "next/dynamic";
import { Modal, Button, Label, FileInput } from "flowbite-react";
import { useEffect, useState } from "react";

const CKEditorClient = dynamic(() => import("@/components/CKEditorClient"), {
  ssr: false,
  loading: () => <p>Loading Editor...</p>,
});

interface CommitteeMeetingMOMModalProps {
  showMomModal: boolean;
  setShowMomModal: (value: boolean) => void;
  handleMOMSubmit: (momData: { momHTML: string; momPDF?: File }) => void;
  momInput: string;
}

const CommitteeMeetingMOMModal: React.FC<CommitteeMeetingMOMModalProps> = ({
  showMomModal,
  setShowMomModal,
  handleMOMSubmit,
  momInput,
}) => {
  const [mounted, setMounted] = useState(false);
  const [content, setContent] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string>("");

  const allowedDocMimeTypes = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.ms-excel.sheet.macroEnabled.12",
    "text/plain",
    "text/csv",
  ]);
  const allowedDocExtensions = [
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".xls",
    ".xlsx",
    ".txt",
    ".csv",
  ];

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (showMomModal) {
      setContent(momInput || "");
      setPdfFile(null);
      setPdfPreview("");
    }
  }, [showMomModal, momInput]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
      const isAllowedType =
        allowedDocMimeTypes.has(file.type) ||
        allowedDocExtensions.includes(extension);

      if (isAllowedType) {
        setPdfFile(file);
        setPdfPreview(file.name);
      } else {
        alert(
          "Please select a valid document (PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, CSV)",
        );
        e.target.value = "";
      }
    }
  };

  const handleRemovePDF = () => {
    setPdfFile(null);
    setPdfPreview("");
    const fileInput = document.getElementById("momPdfInput") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  if (!mounted) return null;

  return (
    <Modal show={showMomModal} onClose={() => setShowMomModal(false)} size="lg">
      <Modal.Header className="border-b border-gold-500">
        <h3 className="text-xl font-serif text-gold-300">
          Add Minutes of Meeting
        </h3>
      </Modal.Header>

      <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="space-y-6">
          {/* MOM Details Editor */}
          <div>
            <Label
              htmlFor="mom"
              value="MOM Details"
              className="text-gold-500 mb-2 block"
            />
            <div className="rounded-lg border border-gold-500 overflow-hidden p-2 min-h-[300px]">
              {mounted && showMomModal && (
                <CKEditorClient
                  key={`editor-${showMomModal}`}
                  value={momInput || ""}
                  onChange={setContent}
                />
              )}
            </div>
          </div>

          {/* PDF Upload Section */}
          <div>
            <Label
              htmlFor="momPdf"
              value="Upload Meeting Minutes Document (Optional)"
              className="text-gold-500 mb-2 block"
            />
            <div className="rounded-lg border border-gold-500/50 p-4 bg-gray-700/50">
              {!pdfFile ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400">
                    Upload a document file with the detailed minutes (PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, CSV)
                  </p>
                  <FileInput
                    id="momPdfInput"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv"
                    onChange={handleFileChange}
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-green-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm text-gray-300">{pdfPreview}</p>
                  </div>
                  <button
                    onClick={handleRemovePDF}
                    className="text-red-400 hover:text-red-300 text-xs font-medium"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-6">
            <Button color="dark" onClick={() => setShowMomModal(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gold-500 text-black"
              onClick={() => {
                handleMOMSubmit({
                  momHTML: content,
                  ...(pdfFile && { momPDF: pdfFile }),
                });
              }}
            >
              Save MOM
            </Button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default CommitteeMeetingMOMModal;
