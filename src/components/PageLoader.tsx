import logoImg from "@/assets/logo.jpg";

export const PageLoader = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
    <div className="relative">
      <img
        src={logoImg}
        alt="PsiRumoCerto"
        className="h-20 w-20 rounded-full object-cover ring-4 ring-primary/20 shadow-xl animate-pulse"
        style={{ animationDuration: "2s" }}
      />
      <div className="absolute inset-0 rounded-full ring-2 ring-primary/30 animate-ping" style={{ animationDuration: "1.5s" }} />
    </div>
    <div className="text-center space-y-1.5">
      <h2 className="text-lg font-bold text-foreground font-display tracking-tight">PsiRumoCerto</h2>
      <p className="text-xs text-muted-foreground">Carregando sistema...</p>
    </div>
    <div className="flex gap-1.5">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="h-2 w-2 rounded-full bg-primary/60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
        />
      ))}
    </div>
  </div>
);
