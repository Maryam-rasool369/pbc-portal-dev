import { Button, Modal } from "flowbite-react";
import { HiOutlineExclamation } from "react-icons/hi";
import Avatar from "./Avatar";

interface ChatConfirmationModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  avatarName?: string | null;
  avatarPicture?: string | null;
  confirmText?: string;
  cancelText?: string;
  isProcessing?: boolean;
}

export default function ChatConfirmationModal({
  show,
  onClose,
  onConfirm,
  title,
  description,
  avatarName,
  avatarPicture,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isProcessing = false,
}: ChatConfirmationModalProps) {
  const handleClose = () => {
    if (!isProcessing) onClose();
  };

  return (
    <Modal show={show} onClose={handleClose} size="sm" dismissible={!isProcessing}>
      <Modal.Header className="border-b border-gold-500/40 bg-gray-900 [&>button]:text-gray-400 [&>button]:hover:text-white [&>button]:hover:bg-gray-800">
        <span className="text-gold-300 font-semibold">{title}</span>
      </Modal.Header>
      <Modal.Body className="bg-gray-900">
        <div className="mx-auto mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10">
          {/* @ts-ignore */}
          <HiOutlineExclamation className="w-6 h-6 text-red-400" />
        </div>

        {avatarName && (
          <div className="flex items-center gap-3 bg-gray-800/60 border border-gold-500/20 rounded-xl px-3 py-2.5 mb-4">
            <Avatar name={avatarName} picture={avatarPicture} size="md" />
            <p className="text-sm font-medium text-white truncate">{avatarName}</p>
          </div>
        )}

        <p className="text-sm text-gray-400 text-center">{description}</p>
      </Modal.Body>
      <Modal.Footer className="bg-gray-900 border-t border-gray-800">
        <div className="flex justify-end gap-3 w-full">
          <Button color="gray" onClick={handleClose} disabled={isProcessing}>
            {cancelText}
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : confirmText}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
