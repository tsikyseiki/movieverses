import { useEffect, useState } from "react";
import { Square, Volume2 } from "lucide-react";

export function SpeakButton({ text, lang = "fr-FR" }: { text: string; lang?: string }) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported, text]);
  if (!supported || !text) return null;

  const toggle = () => {
    const synth = window.speechSynthesis;
    if (speaking) { synth.cancel(); setSpeaking(false); return; }
    synth.cancel();
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2)));
    const parts = text.match(/[^.!?]+[.!?]*/g)?.map((p) => p.trim()).filter(Boolean) ?? [text];
    setSpeaking(true);
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      u.lang = lang;
      u.rate = 0.98;
      if (voice) u.voice = voice;
      if (i === parts.length - 1) u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      synth.speak(u);
    });
  };
  return (
    <button onClick={toggle} className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-5 py-3 font-semibold backdrop-blur hover:bg-background/70">
      {speaking ? <Square className="h-5 w-5 fill-current" /> : <Volume2 className="h-5 w-5" />}
      {speaking ? "Arrêter" : "Écouter le synopsis"}
    </button>
  );
}
