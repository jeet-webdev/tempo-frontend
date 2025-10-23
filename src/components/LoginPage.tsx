import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { LogIn, User } from "lucide-react";

export default function LoginPage() {
  const { login, switchUser } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const success = await login(email, password);
    setIsLoading(false);

    if (!success) {
      toast({
        title: "Login Failed",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    }
  };

  const roles: { role: UserRole; label: string; email: string }[] = [
    { role: "owner", label: "Owner", email: "owner@pc.local" },
    {
      role: "channel_manager",
      label: "Channel Manager",
      email: "manager@pc.local",
    },
    { role: "script_writer", label: "Script Writer", email: "script@pc.local" },
    { role: "audio_editor", label: "Audio Editor", email: "audio@pc.local" },
    { role: "video_editor", label: "Video Editor", email: "video@pc.local" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="glass-card p-10 scale-in">
          {/* Logo/Title */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 mb-6 relative overflow-hidden shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <LogIn className="h-10 w-10 text-white relative z-10 drop-shadow-lg" />
              <div className="absolute inset-0 rounded-3xl border border-white/30"></div>
            </div>
            <h1 className="text-4xl font-bold mb-3" style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(224, 195, 252, 0.95) 50%, rgba(142, 197, 252, 0.95) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Passive Channels
            </h1>
            <p className="text-body text-base">Task Management System</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5 mb-8">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-label"
              >
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-liquid h-14 text-base"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-label"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-liquid h-14 text-base"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="btn-liquid w-full h-14 text-base font-semibold mt-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Logging in...
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  <LogIn className="h-5 w-5" />
                  Sign In
                </span>
              )}
            </Button>
          </form>

          <div className="relative mb-8">
            <div className="divider-liquid"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="px-4 py-1 glass-card text-label text-xs">
                OR DEMO MODE
              </span>
            </div>
          </div>

          {/* Quick Login Buttons */}
          <div className="space-y-3">
            {roles.map(({ role, label, email }) => (
              <button
                key={role}
                onClick={() => switchUser(role)}
                className="w-full h-14 glass-card hover:glass-card flex items-center justify-between px-5 text-sm transition-all duration-250"
              >
                <span className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 flex items-center justify-center relative overflow-hidden shadow-md">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                    <User className="h-5 w-5 text-white relative z-10" />
                    <div className="absolute inset-0 rounded-2xl border border-white/30"></div>
                  </div>
                  <span className="font-semibold text-heading">{label}</span>
                </span>
                <span className="text-muted text-xs">{email}</span>
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-muted mt-8">
            Demo credentials: owner@pc.local / owner123
          </p>
        </div>
      </div>
    </div>
  );
}