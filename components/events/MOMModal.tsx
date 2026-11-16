import dynamic from "next/dynamic";
import { Modal, Button, Label, FileInput } from "flowbite-react";
import { useEffect, useRef, useState } from "react";

const CKEditorClient = dynamic(() => import("@/components/CKEditorClient"), {
  ssr: false,
  loading: () => <p>Loading Editor...</p>,
});

interface MOMModalProps {
  showMomModal: boolean;
  setShowMomModal: (value: boolean) => void;
  handleMOMSubmit: (newMOMHTML: string, attachments?: File[]) => void;
  momInput: string;
}

const hasContent = (html: string) =>
  html.replace(/<[^>]*>/g, "").trim().length > 0;

const MOMModal: React.FC<MOMModalProps> = ({
  showMomModal,
  setShowMomModal,
  handleMOMSubmit,
  momInput,
}) => {
  const [mounted, setMounted] = useState(false);
  const [content, setContent] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  // Pre-fill with the existing MOM when updating
  useEffect(() => {
    if (showMomModal) setContent(momInput || "");
  }, [showMomModal, momInput]);

  const isUpdate = hasContent(momInput || "");

  const handleContentChange = (value: string) => {
    setContent(value);
    if (descriptionError && hasContent(value)) {
      setDescriptionError("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files].slice(0, 10));
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setAttachments([]);
    setDescriptionError("");
    setShowMomModal(false);
  };

  const handleSave = () => {
    if (!hasContent(content)) {
      setDescriptionError("Description is mandatory.");
      return;
    }
    handleMOMSubmit(content, attachments.length > 0 ? attachments : undefined);
  };

  if (!mounted) return null;

  return (
    <Modal show={showMomModal} onClose={handleClose} size="lg">
      <Modal.Header className="border-b border-gold-500">
        <h3 className="text-xl font-serif text-gold-300">
          {isUpdate ? "Update Minutes of Meeting" : "Add Minutes of Meeting"}
        </h3>
      </Modal.Header>

      <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="space-y-6">
          {isUpdate && (
            <p className="text-sm text-yellow-400">
              Saving changes will reset all previous approvals.
            </p>
          )}
          <Label
            htmlFor="mom"
            value="MOM Details"
            className="text-gold-500 mb-2 block"
          />
          <div className={`rounded-lg border overflow-hidden p-2 ${descriptionError ? "border-red-500" : "border-gold-500"}`}>
            <CKEditorClient
              key={`editor-${momInput}`}
              value={momInput}
              onChange={handleContentChange}
            />
          </div>
          {descriptionError && (
            <p className="text-red-400 text-sm mt-1">{descriptionError}</p>
          )}

          <div>
            <Label
              htmlFor="momAttachments"
              value="Attachments (optional)"
              className="text-gold-500 mb-2 block"
            />
            <FileInput
              id="momAttachments"
              ref={fileInputRef}
              multiple
              onChange={handleFileChange}
              helperText="Images or documents"
            />
            {attachments.length > 0 && (
              <ul className="mt-3 space-y-1">
                {attachments.map((file, idx) => (
                  <li key={idx} className="flex items-center justify-between bg-gray-700 px-3 py-2 rounded-lg text-sm text-gray-200">
                    <span className="truncate max-w-xs">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="ml-2 text-red-400 hover:text-red-300 flex-shrink-0"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-4 mt-4">
            <Button color="dark" onClick={handleClose}>
              Cancel
            </Button>
            <Button className="bg-gold-500 text-black" onClick={handleSave}>
              Save MOM
            </Button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default MOMModal;
