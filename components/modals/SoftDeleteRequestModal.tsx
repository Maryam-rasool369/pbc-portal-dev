import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'flowbite-react';
import { createSoftDeleteRequest } from '@/services/softDelete';
import { toast } from 'react-toastify';

interface User {
  id: number | string;
  name: string;
  email?: string;
  Role?: {
    id: number;
    name: string;
  };
}

interface SoftDeleteRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  token: string;
  onSuccess: () => void;
}

const SoftDeleteRequestModal: React.FC<SoftDeleteRequestModalProps> = ({
  isOpen,
  onClose,
  user,
  token,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('No user selected');
      return;
    }

    setIsSubmitting(true);
    const requestData = {
      userId: Number(user.id),
      reason: reason.trim() || undefined,
    };

    try {
      await createSoftDeleteRequest(token, requestData);

      toast.success('Soft delete request created successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating soft delete request:', error);
      toast.error(error?.message || 'Failed to create soft delete request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Modal
      show={isOpen}
      onClose={handleClose}
      size="md"
      dismissible={!isSubmitting}
    >
      <Modal.Header className="border-b border-gray-700 bg-gray-900 text-white">
        Soft Delete Request
      </Modal.Header>
      <Modal.Body className="bg-gray-900 text-white">
        {user && (
          <div className="space-y-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">User Information</h3>
              <p className="flex justify-between border-b border-gray-700 pb-2">
                <span className="font-medium text-gray-400">Name:</span>
                <span className="text-white">{user.name}</span>
              </p>

              <p className="flex justify-between border-b border-gray-700 pb-2">
                <span className="font-medium text-gray-400">Email:</span>
                <span className="text-white">{user.email || 'NA'}</span>
              </p>

              {user.Role?.name && (
                <p className="flex justify-between">
                  <span className="font-medium text-gray-400">Role:</span>
                  <span className="text-white">{user.Role.name}</span>
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="soft-delete-reason"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Reason (Optional)
                </label>
                <textarea
                  id="soft-delete-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Add a reason for the soft delete request..."
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                />
              </div>
            </form>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="bg-gray-900 border-t border-gray-700">
        <div className="flex justify-end gap-4 w-full">
          <Button
            className="bg-gray-700 hover:bg-gray-600 text-white"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            className="bg-gold-500 hover:bg-gold-600 text-black"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 border-t-2 border-black rounded-full animate-spin mr-2" />
                Creating Request...
              </>
            ) : (
              'Create Request'
            )}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default SoftDeleteRequestModal;
