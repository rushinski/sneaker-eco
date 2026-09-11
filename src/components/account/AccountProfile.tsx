"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

import { PasswordRequirements } from "@/components/auth/register/PasswordRequirements";
import { Toast } from "@/components/ui/Toast";
import { isPasswordValid } from "@/lib/validation/password";

export function AccountProfile({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }
    if (!isPasswordValid(newPassword)) {
      setMessage("Password does not meet the required criteria.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(data?.error ?? "Failed to change password");
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      setToast({ message: "Password changed successfully", tone: "success" });
    } catch {
      setMessage("Failed to change password");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch {
      setMessage("Failed to log out. Please try again.");
      setIsSigningOut(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-sm sm:text-base">
      <h1 className="mb-8 text-3xl font-bold text-white">Account Settings</h1>

      {message && (
        <div className="mb-6 rounded bg-red-900/20 p-4 text-red-400">{message}</div>
      )}

      <section className="mb-6 rounded border border-zinc-800/70 bg-zinc-900 p-6">
        <h2 className="mb-3 text-xl font-semibold text-white">Email</h2>
        <p className="text-gray-400">{userEmail}</p>
        <p className="mt-2 text-sm text-gray-500">
          Email changes are not currently supported.
        </p>
      </section>

      <form
        onSubmit={(event) => void handleChangePassword(event)}
        className="mb-6 space-y-4 rounded border border-zinc-800/70 bg-zinc-900 p-6"
      >
        <h2 className="text-xl font-semibold text-white">Change password</h2>
        {[
          {
            label: "New password",
            value: newPassword,
            setValue: setNewPassword,
            visible: newPasswordVisible,
            setVisible: setNewPasswordVisible,
          },
          {
            label: "Confirm password",
            value: confirmPassword,
            setValue: setConfirmPassword,
            visible: confirmPasswordVisible,
            setVisible: setConfirmPasswordVisible,
          },
        ].map(({ label, value, setValue, visible, setVisible }) => (
          <label key={label} className="block">
            <span className="mb-2 block text-gray-300">{label}</span>
            <span className="flex rounded border border-zinc-700 bg-zinc-950">
              <input
                type={visible ? "text" : "password"}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                autoComplete="new-password"
                required
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-white outline-none"
              />
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                aria-label={visible ? "Hide password" : "Show password"}
                className="px-3 text-gray-400 hover:text-white"
              >
                {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>
        ))}
        <PasswordRequirements password={newPassword} />
        <button
          type="submit"
          disabled={isSaving}
          className="rounded bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700 disabled:bg-gray-600"
        >
          {isSaving ? "Saving..." : "Change password"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={isSigningOut}
        className="rounded border border-zinc-700 px-5 py-2 text-gray-300 hover:border-zinc-500 hover:text-white disabled:opacity-50"
      >
        {isSigningOut ? "Signing out..." : "Sign out"}
      </button>

      {toast && (
        <Toast
          open
          message={toast.message}
          tone={toast.tone}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
