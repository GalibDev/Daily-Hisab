"use client";

import { useEffect, useRef, useState } from "react";

export const PET_ENABLED_KEY = "daily-hisab.home-pet-enabled";
export const PET_COLOR_KEY = "daily-hisab.home-pet-color";
const PET_POSITION_KEY = "daily-hisab.home-pet-position";
export const PET_SETTINGS_EVENT = "daily-hisab-pet-settings";

type PetActivity = "walk" | "sit" | "play";

export function FloatingPet() {
  const [enabled, setEnabled] = useState(false);
  const [color, setColor] = useState<"black" | "white">("black");
  const [activity, setActivity] = useState<PetActivity>("sit");
  const [reaction, setReaction] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 150 });
  const positionRef = useRef(position);
  const dragging = useRef<{ pointerId: number; dx: number; dy: number } | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    const load = () => {
      setEnabled(localStorage.getItem(PET_ENABLED_KEY) === "1");
      setColor(localStorage.getItem(PET_COLOR_KEY) === "white" ? "white" : "black");
      try {
        const saved = JSON.parse(localStorage.getItem(PET_POSITION_KEY) || "null") as { x?: number; y?: number } | null;
        if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
          const next = { x: saved.x!, y: saved.y! };
          positionRef.current = next;
          setPosition(next);
        }
      } catch { /* keep the safe default */ }
    };
    load();
    window.addEventListener(PET_SETTINGS_EVENT, load);
    return () => window.removeEventListener(PET_SETTINGS_EVENT, load);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const activities: PetActivity[] = ["walk", "sit", "play", "sit"];
    let index = 0;
    const timer = window.setInterval(() => {
      index = (index + 1) % activities.length;
      setActivity(activities[index]);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [enabled]);

  if (!enabled) return null;
  const fur = color === "black" ? "#171923" : "#f8f7f2";
  const line = color === "black" ? "#edf1ff" : "#17213f";

  return (
    <div
      className="fixed z-[90] touch-none select-none"
      style={{ left: position.x, bottom: position.y }}
      onPointerDown={(event) => {
        moved.current = false;
        dragging.current = { pointerId: event.pointerId, dx: event.clientX - position.x, dy: event.clientY + position.y };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!dragging.current || dragging.current.pointerId !== event.pointerId) return;
        moved.current = true;
        const next = {
          x: Math.max(6, Math.min(window.innerWidth - 82, event.clientX - dragging.current.dx)),
          y: Math.max(86, Math.min(window.innerHeight - 90, dragging.current.dy - event.clientY)),
        };
        positionRef.current = next;
        setPosition(next);
      }}
      onPointerUp={(event) => {
        dragging.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
        localStorage.setItem(PET_POSITION_KEY, JSON.stringify(positionRef.current));
        if (!moved.current) {
          setReaction(true);
          setActivity("play");
          window.setTimeout(() => setReaction(false), 1400);
        }
      }}
      role="button"
      aria-label="Interactive Daily Hisab pet cat"
    >
      {reaction && <span className="pet-heart absolute -right-1 -top-5 text-2xl text-[#ef476f]">♥</span>}
      {activity === "sit" && <span className="absolute -left-1 -top-3 text-xs font-black text-[#7b8499]">z</span>}
      <div className={`pet-body pet-${activity} grid size-[72px] place-items-center rounded-full border border-[#dfe5f4] bg-white shadow-[0_10px_28px_rgba(17,41,143,.22)]`}>
        <svg viewBox="0 0 100 100" className="size-[58px] overflow-visible" aria-hidden="true">
          <path d="M19 68c2-18 16-29 35-27 19 1 28 13 27 30H31c-7 0-11-1-12-3Z" fill={fur} stroke={line} strokeWidth="2" />
          <circle cx="64" cy="39" r="20" fill={fur} stroke={line} strokeWidth="2" />
          <path d="m48 28 4-20 14 15M67 21 82 9l-1 23" fill={fur} stroke={line} strokeWidth="3" strokeLinejoin="round" />
          <path d="M24 62C6 55 6 79 22 82" fill="none" stroke={fur} strokeWidth="9" strokeLinecap="round" />
          <circle cx="59" cy="38" r="2.8" fill="#f97316" /><circle cx="71" cy="38" r="2.8" fill="#f97316" />
          <path d="M63 46q4 4 8 0" fill="none" stroke={line} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <style jsx>{`
        .pet-body { transform-origin: 50% 100%; }
        .pet-walk { animation: petWalk .7s ease-in-out infinite alternate; }
        .pet-sit { animation: petBreathe 1.8s ease-in-out infinite; }
        .pet-play { animation: petPlay .55s ease-in-out infinite alternate; }
        .pet-heart { animation: petHeart 1.3s ease-out forwards; }
        @keyframes petWalk { from { transform: translateX(-8px) rotate(-3deg); } to { transform: translateX(8px) rotate(3deg); } }
        @keyframes petBreathe { 50% { transform: scale(.96, 1.04); } }
        @keyframes petPlay { from { transform: rotate(-10deg) translateY(0); } to { transform: rotate(10deg) translateY(-7px); } }
        @keyframes petHeart { to { transform: translateY(-20px) scale(1.25); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .pet-body, .pet-heart { animation: none; } }
      `}</style>
    </div>
  );
}
