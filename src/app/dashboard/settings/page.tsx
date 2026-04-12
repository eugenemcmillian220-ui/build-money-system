"use client";
import { useState } from "react";
import { signOut, deleteAccount } from "@/lib/auth-actions";
import { 
  LogOut, 
  Trash2, 
  AlertTriangle,
  Settings as SettingsIcon,
  ShieldAlert
} from "lucide-react";

export default function SettingsPage() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDeleteAccount = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    
    setIsDeleting(true);
    const result = await deleteAccount();
    if (result.error) {
      alert("Deletion failed: " + result.error);
      setIsDeleting(false);
      setConfirmDelete(false);
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-12">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">Sovereign Settings</h1>
            <SettingsIcon className="text-brand-500" size={32} />
          </div>
          <p className="text-muted-foreground font-bold italic tracking-tight">Configure your empire's administrative controls.</p>
        </header>

        <div className="grid gap-8">
          {/* Account Security */}
          <section className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-8">
            <h2 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-3">
              <ShieldAlert size={24} className="text-brand-400" />
              Empire Security
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-6 bg-black/40 rounded-2xl border border-white/5">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Neural Link Status</h3>
                  <p className="text-xs text-muted-foreground mt-1">Your session is currently encrypted and active.</p>
                </div>
                <div className="px-3 py-1 bg-green-500/10 text-green-400 text-[10px] font-black uppercase rounded-full">Secure</div>
              </div>
              
              <button 
                onClick={() => signOut()}
                className="w-full flex items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all group"
              >
                <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                Disconnect Neural Link (Logout)
              </button>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-red-500/5 border border-red-500/20 p-8 rounded-[2.5rem] space-y-8">
            <h2 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-3 text-red-400">
              <AlertTriangle size={24} />
              Danger Zone
            </h2>
            
            <div className="p-6 bg-red-500/10 rounded-2xl border border-red-500/20 space-y-4">
              <p className="text-sm font-bold text-red-200">
                Deleting your account will permanently wipe your entire business empire, all manifested projects, and your credit balance. This action cannot be undone.
              </p>
              
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className={`w-full flex items-center justify-center gap-3 p-4 ${
                  confirmDelete ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-red-500/20 hover:bg-red-500/30'
                } text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all`}
              >
                <Trash2 size={18} />
                {isDeleting ? "Wiping Empire Data..." : confirmDelete ? "Confirm Permanent Deletion" : "Initiate Empire Self-Destruct"}
              </button>
              
              {confirmDelete && !isDeleting && (
                <button 
                  onClick={() => setConfirmDelete(false)}
                  className="w-full text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white"
                >
                  Abort Deletion
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
