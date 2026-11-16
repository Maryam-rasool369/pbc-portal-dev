import { Button, Modal } from "flowbite-react";
import { HiOutlineTrash } from "react-icons/hi";
import type { AttachmentType, ChatMessage } from "@/services/chat";

interface DeleteMessageModalProps {
  message: ChatMessage;
  isMine: boolean;
  onClose: () => void;
  onConfirm: (scope?: "for_me") => void;
  isProcessing: boolean;
}

function attachmentLabel(type: AttachmentType): string {
  switch (type) {
    case "IMAGE":
      return "Photo";
    case "VIDEO":
      return "Video";
    case "AUDIO":
      return "Voice message";
    default:
      return "Document";
  }
}

export default function DeleteMessageModal({
  message,
  isMine,
  onClose,
  onConfirm,
  isProcessing,
}: DeleteMessageModalProps) {
  const preview = message.content
    ? message.content
    : message.attachments[0]
      ? attachmentLabel(message.attachments[0].type)
      : "Message";

  const handleClose = () => {
    if (!isProcessing) onClose();
  };

  return (
    <Modal show onClose={handleClose} size="sm" dismissible={!isProcessing}>
      <Modal.Header className="border-b border-gray-800 bg-gray-900 [&>button]:text-gray-400 [&>button]:hover:text-white [&>button]:hover:bg-gray-800">
        <span className="text-white font-semibold">Delete message?</span>
      </Modal.Header>
      <Modal.Body className="bg-gray-900">
        <div className="flex items-start gap-3 bg-gray-800/60 border-l-2 border-red-500/70 rounded-lg px-3 py-2 mb-4">
          {/* @ts-ignore */}
          <HiOutlineTrash className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-300 truncate">{preview}</p>
        </div>
        <p className="text-sm text-gray-400">
          {isMine
            ? "You can remove this message just for you, or for everyone in the conversation."
            : "This deletes the message for everyone in the group, as an admin action."}
        </p>
      </Modal.Body>
      <Modal.Footer className="bg-gray-900 border-t border-gray-800">
        <div className="flex justify-end gap-3 w-full flex-wrap">
          <Button color="gray" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          {isMine && (
            <Button
              color="gray"
              className="!bg-gray-700 hover:!bg-gray-600 text-white"
              onClick={() => onConfirm("for_me")}
              disabled={isProcessing}
            >
              Delete for me
            </Button>
          )}
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => onConfirm()}
            disabled={isProcessing}
          >
            {isProcessing ? "Deleting..." : "Delete for everyone"}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
