import { Modal, Button, Label, TextInput } from "flowbite-react";
import { useState } from "react";
import { toast } from "react-toastify";
import VatBreakdown from "@/components/ui/VatBreakdown";

interface GuestModalProps {
  showGuestModal: boolean;
  setShowGuestModal: (value: boolean) => void;
  eventId: string;
  guestFee: number;
  token: string;
  onSuccess?: () => void;
}

const GuestModal: React.FC<GuestModalProps> = ({
  showGuestModal,
  setShowGuestModal,
  eventId,
  guestFee,
  token,
  onSuccess,
}) => {
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setGuestName("");
    setGuestEmail("");
    setShowGuestModal(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !guestEmail.trim()) {
      toast.error("Guest name and email are required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/event/${eventId}/guests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", token: token || "" },
          body: JSON.stringify({ guestName: guestName.trim(), guestEmail: guestEmail.trim() }),
        }
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error?.[0]?.msg || "Failed to register guest");
      toast.success("Guest added successfully. Use the Pay button to complete payment.");
      handleClose();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to register guest");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      show={showGuestModal}
      onClose={handleClose}
      size="md"
      className="font-sans"
    >
      <Modal.Header className="bg-gray-800 border-b border-gold-500/30 text-gold-500">
        <span className="text-gold-500 font-semibold">Register Guest</span>
      </Modal.Header>
      <Modal.Body className="bg-gray-800 text-white">
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <Label
              htmlFor="guestName"
              value="Guest Name *"
              className="text-gold-500 mb-2 block"
            />
            <TextInput
              id="guestName"
              type="text"
              placeholder="Enter guest full name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
              disabled={loading}
              className="border-gold-500 focus:ring-gold-500 focus:border-gold-500"
            />
          </div>
          <div>
            <Label
              htmlFor="guestEmail"
              value="Guest Email *"
              className="text-gold-500 mb-2 block"
            />
            <TextInput
              id="guestEmail"
              type="email"
              placeholder="Enter guest email address"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              required
              disabled={loading}
              className="border-gold-500 focus:ring-gold-500 focus:border-gold-500"
            />
          </div>
          <div className="space-y-2">
            <VatBreakdown baseAmount={guestFee} compact />
            <p className="text-sm text-gray-400">
              After adding the guest, use the Pay button in the guest list to complete payment.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button color="dark" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gold-500 hover:bg-gold-600 text-black"
              disabled={loading}
            >
              {loading ? "Adding Guest..." : "Add Guest"}
            </Button>
          </div>
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default GuestModal;
