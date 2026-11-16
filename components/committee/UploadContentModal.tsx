import { useState } from "react";
import {
  Modal,
  Button,
  Label,
  Spinner,
  TextInput,
  Checkbox,
  Select,
} from "flowbite-react";
import { toast } from "react-toastify";
import { useLoadingStore } from "@/store/useLoadingStore";
import useAuthStore from "@/store/authStore";
import { uploadCommitteeContent } from "@/services/committee";

interface SubCommitteeOption {
  id: number;
  name: string;
}

interface UploadContentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  committeeId: number;
  subCommittees?: SubCommitteeOption[];
}

const UploadContentModal = ({
  open,
  onClose,
  onSuccess,
  committeeId,
  subCommittees = [],
}: UploadContentModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isConfidential, setIsConfidential] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedSubCommitteeId, setSelectedSubCommitteeId] = useState<string>("");

  const token = useAuthStore((state) => state.token);
  const setLoading = useLoadingStore((state) => state.setLoading);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name);
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!title.trim()) {
      toast.error("Please enter a title for the content");
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      await uploadCommitteeContent(
        token || "",
        committeeId,
        file,
        title.trim(),
        isConfidential,
        selectedSubCommitteeId ? Number(selectedSubCommitteeId) : undefined,
      );
      toast.success("Content uploaded successfully!");
      handleClose();
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload content",
      );
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setTitle("");
    setIsConfidential(false);
    setSelectedSubCommitteeId("");
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Modal show={open} onClose={isSubmitting ? undefined : handleClose} size="md">
      <Modal.Header className="border-b border-gold-500">
        <p className="text-xl font-serif text-gold-300">Upload Content</p>
      </Modal.Header>

      <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label
              value="Select File"
              className="text-gold-500 mb-4 block text-lg font-semibold"
            />
            <p className="text-gray-400 text-sm mb-4">
              Upload a file to add to this committee. Supported formats: PDF,
              DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, and images.
            </p>

            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? "border-gold-500 bg-gold-500/10"
                  : "border-gray-600 hover:border-gray-500"
              } ${isSubmitting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() =>
                !isSubmitting &&
                document.getElementById("committee-file-upload")?.click()
              }
            >
              <input
                id="committee-file-upload"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                disabled={isSubmitting}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.bmp,.webp"
              />

              {file ? (
                <div className="space-y-2">
                  <div className="text-gold-300 font-medium">{file.name}</div>
                  <div className="text-gray-400 text-sm">
                    {formatFileSize(file.size)}
                  </div>
                  <Button
                    type="button"
                    color="red"
                    size="sm"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    disabled={isSubmitting}
                  >
                    Remove File
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-gray-400">
                    <svg
                      className="mx-auto h-12 w-12"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="text-gray-300">
                    <span className="font-medium">Click to upload</span> or drag
                    and drop
                  </div>
                  <div className="text-gray-400 text-sm">
                    PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, PNG, etc.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label
              htmlFor="committee-content-title"
              value="Content Title"
              className="text-gold-500 mb-2 block font-medium"
            />
            <TextInput
              id="committee-content-title"
              type="text"
              placeholder="Enter a title for this content"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {subCommittees.length > 0 && (
            <div>
              <Label
                htmlFor="committee-sub-committee"
                value="Tag to Sub-Committee (optional)"
                className="text-gold-500 mb-2 block font-medium"
              />
              <Select
                id="committee-sub-committee"
                value={selectedSubCommitteeId}
                onChange={(e) => setSelectedSubCommitteeId(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">— Committee level —</option>
                {subCommittees.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <Checkbox
              id="committee-confidential"
              checked={isConfidential}
              onChange={(e) => setIsConfidential(e.target.checked)}
              disabled={isSubmitting}
            />
            <Label htmlFor="committee-confidential" className="text-gray-300">
              Mark as confidential
            </Label>
          </div>

          {isConfidential && (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <svg
                  className="w-5 h-5 text-yellow-400 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-yellow-300 font-medium text-sm">
                    Confidential Content
                  </p>
                  <p className="text-yellow-200/80 text-xs mt-1">
                    This content will only be visible to admins only.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4 mt-8">
            <Button color="dark" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gold-500 hover:bg-gold-600 text-black"
              disabled={!file || !title.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Uploading...
                </>
              ) : (
                "Upload Content"
              )}
            </Button>
          </div>
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default UploadContentModal;
