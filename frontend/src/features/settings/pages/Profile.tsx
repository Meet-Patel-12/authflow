import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { User, Mail, Camera, Save, Lock, Trash2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { getCurrentUser } from "../../auth/authSlice";
import api from "../../../app/apiClient";
import { Spinner, Alert } from "../../../components/ui";

const schema = z.object({
  name: z.string().min(2, "At least 2 characters"),
});
type FormData = z.infer<typeof schema>;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_MB = 2;

export default function Profile() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatar ?? null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name || "" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setSuccess(false);
    try {
      await api.patch("/auth/profile", data);
      await dispatch(getCurrentUser());
      setSuccess(true);
      toast.success("Profile updated");
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, WebP or GIF images are allowed");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be under ${MAX_SIZE_MB} MB`);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    setAvatarLoading(true);

    try {
      const form = new FormData();
      form.append("avatar", file);
      await api.patch("/auth/profile/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await dispatch(getCurrentUser());
      toast.success("Avatar updated");
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to upload avatar");
      setAvatarPreview(user?.avatar ?? null);
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarLoading(true);
    try {
      await api.delete("/auth/profile/avatar");
      setAvatarPreview(null);
      await dispatch(getCurrentUser());
      toast.success("Avatar removed");
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to remove avatar");
    } finally {
      setAvatarLoading(false);
    }
  };

  if (!user) return null;

  const initials = user.name?.charAt(0).toUpperCase() ?? "?";

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Manage your personal information</p>
      </div>

      {/* ── Avatar hero card ── */}
      <div
        className="rounded-2xl mb-5 overflow-hidden animate-slide-up"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}>
        {/* Gradient banner */}
        <div
          className="h-28 w-full relative"
          style={{
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.35) 0%, rgba(6,182,212,0.2) 60%, rgba(16,185,129,0.12) 100%)",
          }}>
          {/* Subtle grid on banner */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        <div className="px-6 pb-6">
          {/* Avatar row — overlaps banner */}
          <div className="flex items-end justify-between -mt-11 mb-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center text-white text-4xl font-bold"
                style={{
                  background: avatarPreview
                    ? "var(--bg-elevated)"
                    : "linear-gradient(135deg, #6366f1, #818cf8)",
                  boxShadow:
                    "0 0 0 4px var(--bg-elevated), 0 0 0 6px rgba(99,102,241,0.35)",
                }}>
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              {/* Loading overlay */}
              {avatarLoading && (
                <div
                  className="absolute inset-0 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.65)" }}>
                  <Spinner size={22} />
                </div>
              )}

              {/* Camera badge */}
              <button
                type="button"
                disabled={avatarLoading}
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{
                  background: "var(--accent)",
                  boxShadow:
                    "0 0 0 3px var(--bg-elevated), 0 0 12px rgba(99,102,241,0.4)",
                }}
                title="Change photo">
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
            </div>

            {/* Remove button — only when avatar set */}
            {avatarPreview && (
              <button
                type="button"
                disabled={avatarLoading}
                onClick={handleRemoveAvatar}
                className="btn btn-danger gap-1.5 text-xs self-end">
                <Trash2 className="w-3.5 h-3.5" />
                Remove photo
              </button>
            )}
          </div>

          {/* Name / email / role */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className="text-xl font-bold leading-tight"
                style={{ color: "var(--text-primary)" }}>
                {user.name}
              </p>
              <p
                className="text-sm mt-0.5"
                style={{ color: "var(--text-muted)" }}>
                {user.email}
              </p>
              <span className="badge badge-accent mt-2 inline-flex">
                {user.role}
              </span>
            </div>
            <p
              className="text-xs text-right leading-relaxed flex-shrink-0"
              style={{ color: "var(--text-muted)" }}>
              JPG, PNG, WebP or GIF
              <br />
              Max {MAX_SIZE_MB} MB
            </p>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      {/* ── Personal info card ── */}
      <div
        className="rounded-2xl p-6 animate-slide-up"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          animationDelay: "60ms",
        }}>
        <h2
          className="text-sm font-semibold mb-5"
          style={{ color: "var(--text-primary)" }}>
          Personal Information
        </h2>

        {success && (
          <Alert
            variant="success"
            className="mb-4">
            Profile updated successfully.
          </Alert>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5">
          {/* Name */}
          <div>
            <label className="label-dark">Full name</label>
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "var(--text-muted)" }}
              />
              <input
                {...register("name")}
                className="input-dark pl-9"
                placeholder="Jane Smith"
              />
            </div>
            {errors.name && (
              <p
                className="mt-1 text-xs"
                style={{ color: "var(--danger)" }}>
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Email — locked */}
          <div>
            <label className="label-dark">Email address</label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "var(--text-muted)" }}
              />
              <input
                value={user.email}
                readOnly
                disabled
                className="input-dark pl-9 pr-9"
                style={{ cursor: "not-allowed", opacity: 0.45 }}
              />
              <Lock
                className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                style={{ color: "var(--text-muted)" }}
              />
            </div>
            <p
              className="mt-1.5 text-xs"
              style={{ color: "var(--text-muted)" }}>
              Email cannot be changed. Contact support if you need to update it.
            </p>
          </div>

          {/* Read-only metadata */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border)",
            }}>
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}>
              Read-only
            </p>
            {[
              { label: "User ID", value: user.id },
              { label: "Role", value: user.role },
              {
                label: "Member since",
                value: new Date(user.createdAt).toLocaleDateString(),
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between">
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}>
                  {label}
                </span>
                <code
                  className="text-xs font-mono"
                  style={{ color: "var(--text-secondary)" }}>
                  {value}
                </code>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary gap-2">
            {loading ? <Spinner size={14} /> : <Save className="w-4 h-4" />}
            Save changes
          </button>
        </form>
      </div>
    </div>
  );
}
