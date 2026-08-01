"use client";

import { useEffect, useRef, useState } from "react";
import Lottie from "lottie-react";

export const PET_ENABLED_KEY = "daily-hisab.home-pet-enabled";
export const PET_COLOR_KEY = "daily-hisab.home-pet-color";
const PET_POSITION_KEY = "daily-hisab.home-pet-position";
export const PET_SETTINGS_EVENT = "daily-hisab-pet-settings";

export type PetColor = "brown" | "default" | "black" | "white";

export function FloatingPet() {
  const [enabled, setEnabled] = useState(false);
  const [color, setColor] = useState<PetColor>("default");
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [reaction, setReaction] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 150 });
  const positionRef = useRef(position);
  const dragging = useRef<{ pointerId: number; dx: number; dy: number } | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    const load = () => {
      setEnabled(localStorage.getItem(PET_ENABLED_KEY) === "1");
      const savedColor = localStorage.getItem(PET_COLOR_KEY);
      setColor((["brown", "default", "black", "white"].includes(savedColor || "") ? savedColor : "default") as PetColor);
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
    fetch("/pet/walking-cat.json").then((response) => response.json()).then((data: object) => setAnimationData(data)).catch(() => setAnimationData(null));
  }, []);

  if (!enabled) return null;
  const colorFilter = color === "brown" ? "sepia(.72) saturate(1.55) hue-rotate(345deg) brightness(.95)" : color === "black" ? "grayscale(1) brightness(.24) contrast(1.45)" : color === "white" ? "grayscale(1) brightness(2.15) contrast(.72)" : "none";

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
          window.setTimeout(() => setReaction(false), 1400);
        }
      }}
      role="button"
      aria-label="Interactive Daily Hisab pet cat"
    >
      {reaction && <span className="pet-heart absolute -right-1 -top-5 text-2xl text-[#ef476f]">♥</span>}
      <div className={`pet-body ${reaction ? "pet-loved" : ""} grid size-[92px] place-items-center`}>
        {animationData && <Lottie animationData={animationData} loop autoplay className="size-[92px]" style={{ filter: colorFilter }} />}
      </div>
      <style jsx>{`
        .pet-body { transform-origin: 50% 100%; animation: petTravel 3.4s ease-in-out infinite alternate; }
        .pet-loved { animation: petPlay .38s ease-in-out 4 alternate; }
        .pet-heart { animation: petHeart 1.3s ease-out forwards; }
        @keyframes petTravel { from { transform: translateX(-14px); } to { transform: translateX(14px); } }
        @keyframes petPlay { from { transform: rotate(-10deg) translateY(0); } to { transform: rotate(10deg) translateY(-7px); } }
        @keyframes petHeart { to { transform: translateY(-20px) scale(1.25); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .pet-body, .pet-heart { animation: none; } }
      `}</style>
    </div>
  );
}
