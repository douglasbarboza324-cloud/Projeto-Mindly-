import React, { useState } from "react";
import { Phone, Heart } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function EmergencyButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-2xl transition-all hover:scale-105 active:scale-95 lg:bottom-6 lg:right-6"
        aria-label="Emergência"
      >
        <Phone className="w-6 h-6" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <div className="text-center space-y-6 py-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <Heart className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-heading font-semibold text-foreground">
              Você não está sozinho(a)
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Se você está passando por um momento difícil, por favor entre em contato com um dos serviços abaixo. Profissionais estão prontos para te ouvir.
            </p>

            <div className="space-y-3">
              <a
                href="tel:188"
                className="flex items-center gap-4 p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
              >
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-red-700">CVV — Ligue 188</p>
                  <p className="text-sm text-red-600">Centro de Valorização da Vida — 24h</p>
                </div>
              </a>

              <a
                href="https://www.cvv.org.br"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-blue-700">Chat CVV Online</p>
                  <p className="text-sm text-blue-600">www.cvv.org.br — Atendimento por chat</p>
                </div>
              </a>

              <a
                href="tel:192"
                className="flex items-center gap-4 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
              >
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-green-700">SAMU — Ligue 192</p>
                  <p className="text-sm text-green-600">Emergência médica — 24h</p>
                </div>
              </a>
            </div>

            <p className="text-xs text-muted-foreground">
              Este aplicativo não substitui acompanhamento profissional de saúde mental.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}