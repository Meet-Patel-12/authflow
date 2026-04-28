import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, X, Mail } from "lucide-react";
import { organizationMembersService } from "../../api/organizationMembers.api";
import { Spinner, Alert } from "../ui";
import { DarkDropdown } from "../ui/dropDown";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

interface DropOption {
  value: string;
  label: string;
  desc: string;
}

const ROLE_OPTIONS: DropOption[] = [
  {
    value: "member",
    label: "Member",
    desc: "Standard access to the organization",
  },
  {
    value: "admin",
    label: "Admin",
    desc: "Can manage members and org settings",
  },
];

/* ═══════════════════════════════════════════
   MAIN MODAL
═══════════════════════════════════════════ */
const InviteMemberModal = ({ onClose, onSuccess }: Props) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const invite = async () => {
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await organizationMembersService.inviteMember(email.trim(), role);
      toast.success("Invitation sent!");
      onSuccess();
      onClose();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || "Failed to invite member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <div className="modal-box p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--accent-dim)" }}>
              <UserPlus
                className="w-4 h-4"
                style={{ color: "var(--accent)" }}
              />
            </div>
            <div>
              <h2
                className="text-base font-semibold"
                style={{ color: "var(--text-primary)" }}>
                Invite Member
              </h2>
              <p
                className="text-xs"
                style={{ color: "var(--text-muted)" }}>
                They'll receive an email with a join link
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="btn btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        {/* Email */}
        <div>
          <label className="label-dark">Email address</label>
          <div className="relative">
            <Mail
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="input-dark pl-9"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && invite()}
            />
          </div>
        </div>

        {/* Role */}
        <div>
          <label className="label-dark">Role</label>
          <DarkDropdown
            value={role}
            onChange={(v) => setRole(v as "admin" | "member")}
            options={ROLE_OPTIONS}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            className="btn btn-ghost flex-1"
            onClick={onClose}
            disabled={loading}>
            Cancel
          </button>
          <button
            className="btn btn-primary flex-1 gap-2"
            onClick={invite}
            disabled={loading}>
            {loading ? (
              <>
                <Spinner size={14} /> Sending...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Send invite
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteMemberModal;
