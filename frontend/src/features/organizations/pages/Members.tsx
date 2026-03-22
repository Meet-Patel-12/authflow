import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Crown, Shield, User, UserMinus, Users, UserPlus } from "lucide-react";
import { useAppSelector } from "../../../app/hooks";
import { organizationMembersService } from "../api/organizationMembers.api";
import type { Member } from "../api/organizationMembers.api";
import { Spinner, EmptyState, Alert } from "../../../components/ui";
import InviteMemberModal from "../components/InviteMemberModal";
import { DarkDropdown } from "../../../components/ui/dropDown";

/* ─── Role config ─── */
const ROLE_CONFIG = {
  owner: { label: "Owner", icon: Crown, badge: "badge-warning" },
  admin: { label: "Admin", icon: Shield, badge: "badge-accent" },
  member: { label: "Member", icon: User, badge: "badge-muted" },
} as const;

const ROLE_ORDER = { owner: 0, admin: 1, member: 2 } as const;

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

/* ─── MemberAvatar at module level ─── */
const MemberAvatar = ({
  member,
  size = 40,
}: {
  member: Member;
  size?: number;
}) => (
  <div
    className="rounded-xl overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0"
    style={{
      width: size,
      height: size,
      fontSize: size * 0.38,
      background: member.avatar
        ? "transparent"
        : "linear-gradient(135deg, #6366f1, #818cf8)",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
    }}>
    {member.avatar ? (
      <img
        src={member.avatar}
        alt={member.name}
        className="w-full h-full object-cover"
      />
    ) : (
      member.name.charAt(0).toUpperCase()
    )}
  </div>
);

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
const Members = () => {
  const { user } = useAppSelector((s) => s.auth);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadMembers = async () => {
    try {
      const res = await organizationMembersService.getMembers();
      setMembers(res.data?.members || []);
    } catch {
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const currentMember = members.find((m) => m.userId === user?.id);
  const currentUserRole = currentMember?.role ?? "member";
  const isOwner = currentUserRole === "owner";
  const isAdminOrOwner = isOwner || currentUserRole === "admin";

  const canChangeRole = (t: Member) => {
    if (t.role === "owner" || t.userId === user?.id) return false;
    if (isOwner) return true;
    if (currentUserRole === "admin" && t.role === "member") return true;
    return false;
  };

  const canRemove = (t: Member) => {
    if (t.role === "owner" || t.userId === user?.id) return false;
    if (isOwner) return true;
    if (currentUserRole === "admin" && t.role === "member") return true;
    return false;
  };

  const changeRole = async (member: Member, role: "admin" | "member") => {
    setUpdatingId(member.id);
    try {
      await organizationMembersService.updateRole(member.id, role);
      toast.success("Role updated");
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, role } : m)),
      );
    } catch {
      toast.error("Failed to update role");
    } finally {
      setUpdatingId(null);
    }
  };

  const removeMember = async (member: Member) => {
    if (!confirm(`Remove ${member.name} from the organization?`)) return;
    setRemovingId(member.id);
    try {
      await organizationMembersService.removeMember(member.id);
      toast.success("Member removed");
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setRemovingId(null);
    }
  };

  const sorted = [...members].sort(
    (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role],
  );

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-subtitle">
            {members.length} member{members.length !== 1 ? "s" : ""} in this
            organization
          </p>
        </div>
        {isAdminOrOwner && (
          <button
            onClick={() => setInviteOpen(true)}
            className="btn btn-primary gap-2">
            <UserPlus className="w-4 h-4" /> Invite member
          </button>
        )}
      </div>

      {isOwner && (
        <Alert
          variant="warning"
          className="mb-5">
          <p className="font-semibold text-xs mb-0.5">You are the owner</p>
          <p className="text-xs font-normal">
            You can manage roles and remove any member. Ownership transfer is
            not available here.
          </p>
        </Alert>
      )}

      {loading ? (
        <div
          className="rounded-2xl"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3.5 w-36 rounded" />
                <div className="skeleton h-3 w-48 rounded" />
              </div>
              <div className="skeleton h-8 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div
          className="rounded-2xl py-16"
          style={{
            background: "var(--bg-elevated)",
            border: "1px dashed var(--border)",
          }}>
          <EmptyState
            icon={Users}
            title="No members yet"
            description="Invite your team to collaborate in this organization"
            action={
              isAdminOrOwner ? (
                <button
                  onClick={() => setInviteOpen(true)}
                  className="btn btn-primary gap-2">
                  <UserPlus className="w-4 h-4" /> Invite member
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}>
          {sorted.map((member, i) => {
            const config = ROLE_CONFIG[member.role];
            const RoleIcon = config.icon;
            const isSelf = member.userId === user?.id;
            const isUpdating = updatingId === member.id;
            const isRemoving = removingId === member.id;

            return (
              <div
                key={member.id}
                className="flex items-center gap-4 px-5 py-4 animate-slide-up"
                style={{
                  borderBottom:
                    i < sorted.length - 1
                      ? "1px solid rgba(255,255,255,0.04)"
                      : "none",
                  background: isSelf ? "rgba(99,102,241,0.04)" : "transparent",
                  animationDelay: `${i * 35}ms`,
                }}>
                <MemberAvatar
                  member={member}
                  size={40}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--text-primary)" }}>
                      {member.name}
                    </p>
                    {isSelf && (
                      <span className="badge badge-accent text-[10px]">
                        You
                      </span>
                    )}
                    <span className={`badge ${config.badge} gap-1`}>
                      <RoleIcon className="w-2.5 h-2.5" />
                      {config.label}
                    </span>
                  </div>
                  <p
                    className="text-xs truncate"
                    style={{ color: "var(--text-muted)" }}>
                    {member.email}
                  </p>
                  <p
                    className="text-[11px] mt-0.5"
                    style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                    Joined{" "}
                    {new Date(member.joinedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {canChangeRole(member) ? (
                    isUpdating ? (
                      <div
                        className="flex items-center justify-center"
                        style={{ width: 110, height: 34 }}>
                        <Spinner size={14} />
                      </div>
                    ) : (
                      <DarkDropdown
                        value={member.role === "owner" ? "member" : member.role}
                        onChange={(v) =>
                          changeRole(member, v as "admin" | "member")
                        }
                        options={ROLE_OPTIONS}
                        compact
                      />
                    )
                  ) : (
                    <div style={{ width: 110 }} />
                  )}

                  {canRemove(member) ? (
                    <button
                      onClick={() => removeMember(member)}
                      disabled={isRemoving}
                      className="btn btn-danger p-2"
                      title={`Remove ${member.name}`}>
                      {isRemoving ? (
                        <Spinner size={14} />
                      ) : (
                        <UserMinus className="w-4 h-4" />
                      )}
                    </button>
                  ) : (
                    <div style={{ width: 36 }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {inviteOpen && (
        <InviteMemberModal
          onClose={() => setInviteOpen(false)}
          onSuccess={loadMembers}
        />
      )}
    </div>
  );
};

export default Members;
