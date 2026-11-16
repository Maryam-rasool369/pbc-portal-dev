import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'flowbite-react';
import { createRoleTransmissionRequest } from '@/services/roleTransmission';
import { toast } from 'react-toastify';

interface Role {
    id: number;
    name: string;
}

interface User {
    id: number | string;
    name: string;
    email: string;
    Role: {
        id: number;
        name: string;
    };
}

interface RoleTransitionModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    roles: Role[];
    token: string;
    onSuccess: () => void;
}

const RoleTransitionModal: React.FC<RoleTransitionModalProps> = ({
    isOpen,
    onClose,
    user,
    roles,
    token,
    onSuccess,
}) => {
    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedRoleId(null);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedRoleId || !user) {
            toast.error('Please select a role');
            return;
        }

        if (selectedRoleId === user.Role.id) {
            toast.error('Please select a different role than the current one');
            return;
        }

        setIsSubmitting(true);
        const requestData = {
            userId: Number(user.id),
            newRoleId: selectedRoleId,
        };

        try {
            await createRoleTransmissionRequest(token, requestData);

            toast.success('Role transition request created successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error creating role transition request:', error);
            toast.error(error?.message || 'Failed to create role transition request');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            onClose();
        }
    };

    // Filter out the user's current role from available roles
    const availableRoles = roles.filter(role => role.id !== user?.Role.id);

    return (
        <Modal
            show={isOpen}
            onClose={handleClose}
            size="md"
            dismissible={!isSubmitting}
        >
            <Modal.Header className="border-b border-gray-700 bg-gray-900 text-white">
                Role Transfer Request
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
                                <span className="text-white">{user.email}</span>
                            </p>

                            <p className="flex justify-between">
                                <span className="font-medium text-gray-400">Current Role:</span>
                                <span className="text-white">{user.Role.name}</span>
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="role-select" className="block text-sm font-medium text-gray-300 mb-2">
                                    Select New Role
                                </label>
                                <select
                                    id="role-select"
                                    value={selectedRoleId || ''}
                                    onChange={(e) => setSelectedRoleId(Number(e.target.value))}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                    disabled={isSubmitting}
                                >
                                    <option value="">Choose a role...</option>
                                    {availableRoles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
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
                        disabled={isSubmitting || !selectedRoleId}
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

export default RoleTransitionModal;
