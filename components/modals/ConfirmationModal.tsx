import { FC, ReactNode } from "react";
import { Button, Modal } from "flowbite-react";

interface ConfirmationModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  isProcessing?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl";
}

const ConfirmationModal: FC<ConfirmationModalProps> = ({
  show,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmColor = "failure",
  isProcessing = false,
  size = "md",
}) => {
  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  return (
    <Modal 
      show={show} 
      onClose={handleClose}
      size={size}
      dismissible={!isProcessing}
    >
      <Modal.Header className="border-b border-gray-700 bg-gray-900 text-white">
        {title}
      </Modal.Header>
      <Modal.Body className="bg-gray-900 text-white">
        {typeof message === "string" ? <p>{message}</p> : message}
      </Modal.Body>
      <Modal.Footer className="bg-gray-900 border-t border-gray-700">
        <div className="flex justify-end gap-4 w-full">
          <Button color="gray" onClick={handleClose} disabled={isProcessing}>
            {cancelText}
          </Button>
          <Button
            className={`bg-${confirmColor}-600 hover:bg-${confirmColor}-700`}
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="h-4 w-4 border-t-2 border-white rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmationModal;