import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordField({ id, value, onChange, label, placeholder, autoComplete = "current-password", required = true, minLength, maxLength, className = "" }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-label={label}
        className={`w-full rounded-xl border border-input bg-background px-3 py-3 pr-12 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? `Ocultar ${label || "senha"}` : `Mostrar ${label || "senha"}`}
        aria-pressed={visible}
        className="absolute inset-y-0 right-2 flex min-h-11 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}
