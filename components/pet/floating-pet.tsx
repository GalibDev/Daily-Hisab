"use client";

import { useEffect, useRef, useState } from "react";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import Image from "next/image";

export const PET_ENABLED_KEY = "daily-hisab.home-pet-enabled";
export const PET_COLOR_KEY = "daily-hisab.home-pet-color";
export const PET_SIZE_KEY = "daily-hisab.home-pet-size";
export const PET_MODE_KEY = "daily-hisab.home-pet-mode";
export const PET_SPEED_KEY = "daily-hisab.home-pet-speed";
export const PET_VARIANT_KEY = "daily-hisab.home-pet-variant";
const PET_POSITION_KEY = "daily-hisab.home-pet-position.v2";
export const PET_SETTINGS_EVENT = "daily-hisab-pet-settings";

export type PetColor = "brown" | "default" | "black" | "white";
export type PetSize = "small" | "medium" | "large";
export type PetMode = "automatic" | "default" | "sit";
export type PetSpeed = "slow" | "normal" | "fast";
export type PetVariant = "classic" | "mewmew" | "both";

export function FloatingPet() {
  const [enabled, setEnabled] = useState(false);
  const [color, setColor] = useState<PetColor>("default");
  const [petSize, setPetSize] = useState<PetSize>("medium");
  const [petMode, setPetMode] = useState<PetMode>("default");
  const [petSpeed, setPetSpeed] = useState<PetSpeed>("normal");
  const [petVariant, setPetVariant] = useState<PetVariant>("both");
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [reaction, setReaction] = useState(false);
  const [facingRight, setFacingRight] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 150 });
  const positionRef = useRef(position);
  const dragging = useRef<{ pointerId: number; dx: number; dy: number } | null>(null);
  const moved = useRef(false);
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const autoDirection = useRef(-1);
  // MewMew's source GIF has a large transparent canvas, so it needs a larger
  // render box for Small/Medium/Large to match the visible Classic Cat sizes.
  const classicSizePx = petSize === "small" ? 72 : petSize === "large" ? 124 : 92;
  const mewMewSizePx = petSize === "small" ? 120 : petSize === "large" ? 240 : 180;
  const sizePx = petVariant === "mewmew" ? mewMewSizePx : petVariant === "both" ? classicSizePx + mewMewSizePx : classicSizePx;
  const heightPx = petVariant === "mewmew" || petVariant === "both" ? mewMewSizePx : classicSizePx;

  useEffect(() => {
    const load = () => {
      setEnabled(localStorage.getItem(PET_ENABLED_KEY) !== "0");
      const savedColor = localStorage.getItem(PET_COLOR_KEY);
      setColor((["brown", "default", "black", "white"].includes(savedColor || "") ? savedColor : "default") as PetColor);
      const savedSize = localStorage.getItem(PET_SIZE_KEY);
      setPetSize((["small", "medium", "large"].includes(savedSize || "") ? savedSize : "medium") as PetSize);
      const savedMode = localStorage.getItem(PET_MODE_KEY);
      setPetMode((["automatic", "default", "sit"].includes(savedMode || "") ? savedMode : "default") as PetMode);
      const savedSpeed = localStorage.getItem(PET_SPEED_KEY);
      setPetSpeed((["slow", "normal", "fast"].includes(savedSpeed || "") ? savedSpeed : "normal") as PetSpeed);
      const savedVariant = localStorage.getItem(PET_VARIANT_KEY);
      setPetVariant(savedVariant === "classic" || savedVariant === "mewmew" ? savedVariant : "both");
      try {
        const saved = JSON.parse(localStorage.getItem(PET_POSITION_KEY) || "null") as { x?: number; y?: number } | null;
        if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
          const next = { x: saved.x!, y: saved.y! };
          positionRef.current = next;
          setPosition(next);
        } else {
          const next = { x: Math.max(12, window.innerWidth - 160), y: window.innerWidth >= 1024 ? 96 : Math.max(100, window.innerHeight - 170) };
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
    if (petVariant === "mewmew") {
      return;
    }
    const suffix = color === "default" ? "" : `-${color}`;
    fetch(`/pet/walking-cat${suffix}.json`).then((response) => response.json()).then((data: object) => setAnimationData(data)).catch(() => setAnimationData(null));
  }, [color, petVariant]);

  useEffect(() => {
    const speed = petMode === "sit" ? .22 : petSpeed === "slow" ? .65 : petSpeed === "fast" ? 1.55 : 1;
    lottieRef.current?.setSpeed(speed);
  }, [animationData, petMode, petSpeed]);

  useEffect(() => {
    if (!enabled || petMode !== "automatic") return;
    const step = petSpeed === "slow" ? .8 : petSpeed === "fast" ? 2.2 : 1.35;
    let tick = 0;
    const timer = window.setInterval(() => {
      tick += 1;
      if (tick % 95 === 0) {
        setReaction(true);
        window.setTimeout(() => setReaction(false), 900);
      }
      setPosition((current) => {
        let x = current.x + autoDirection.current * step;
        if (x <= 8) { x = 8; autoDirection.current = 1; setFacingRight(true); }
        if (x >= window.innerWidth - sizePx) { x = window.innerWidth - sizePx; autoDirection.current = -1; setFacingRight(false); }
        const next = { ...current, x };
        positionRef.current = next;
        return next;
      });
    }, 60);
    return () => window.clearInterval(timer);
  }, [enabled, petMode, petSpeed, sizePx]);

  if (!enabled) return null;

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
          x: Math.max(6, Math.min(window.innerWidth - sizePx, event.clientX - dragging.current.dx)),
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
      <div className={`pet-body pet-mode-${petMode} ${reaction ? "pet-loved" : ""} flex items-end justify-center`} style={{ width: sizePx, height: heightPx }}>
        {(petVariant === "classic" || petVariant === "both") && animationData && <Lottie lottieRef={lottieRef} animationData={animationData} loop autoplay style={{ flex: "none", width: classicSizePx, height: classicSizePx, transform: facingRight ? "scaleX(-1)" : "none" }} />}
        {(petVariant === "mewmew" || petVariant === "both") && (
          <Image src="/pet/mewmew.gif" alt="MewMew pixel cat" width={mewMewSizePx} height={mewMewSizePx} unoptimized draggable={false} className="mewmew-pet" style={{ flex: "none", width: mewMewSizePx, height: mewMewSizePx, transform: facingRight ? "scaleX(-1)" : "none" }} />
        )}
      </div>
      <style jsx>{`
        .pet-body { transform-origin: 50% 100%; }
        .pet-mode-default { animation: petTravel 3.4s ease-in-out infinite alternate; }
        .pet-mode-sit { transform: scaleY(.8) translateY(12%); }
        .pet-loved { animation: petPlay .38s ease-in-out 4 alternate; }
        .pet-heart { animation: petHeart 1.3s ease-out forwards; }
        .mewmew-pet { object-fit: contain; image-rendering: pixelated; user-select: none; pointer-events: none; }
        @keyframes petTravel { from { transform: translateX(-14px); } to { transform: translateX(14px); } }
        @keyframes petPlay { from { transform: rotate(-10deg) translateY(0); } to { transform: rotate(10deg) translateY(-7px); } }
        @keyframes petHeart { to { transform: translateY(-20px) scale(1.25); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .pet-body, .pet-heart { animation: none; } }
      `}</style>
    </div>
  );
}
