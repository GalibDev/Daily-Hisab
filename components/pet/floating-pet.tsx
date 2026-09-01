"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";

export const PET_ENABLED_KEY = "daily-hisab.home-pet-enabled";
export const PET_COLOR_KEY = "daily-hisab.home-pet-color";
export const PET_SIZE_KEY = "daily-hisab.home-pet-size";
export const PET_MODE_KEY = "daily-hisab.home-pet-mode";
export const PET_SPEED_KEY = "daily-hisab.home-pet-speed";
export const PET_VARIANT_KEY = "daily-hisab.home-pet-variant";
export const PET_SETTINGS_EVENT = "daily-hisab-pet-settings";

export type PetColor = "brown" | "default" | "black" | "white";
export type PetSize = "small" | "medium" | "large";
export type PetMode = "automatic" | "default" | "sit";
export type PetSpeed = "slow" | "normal" | "fast";
export type PetVariant = "classic" | "mewmew" | "both";
type PetKind = "classic" | "mewmew";

type PetActorProps = { kind: PetKind; sizePx: number; mode: PetMode; speed: PetSpeed; animationData: object | null };

function PetActor({ kind, sizePx, mode, speed, animationData }: Readonly<PetActorProps>) {
  const positionKey = `daily-hisab.home-pet-position.${kind}.v3`;
  const [reaction, setReaction] = useState(false);
  const [facingRight, setFacingRight] = useState(kind === "mewmew");
  const [position, setPosition] = useState({ x: kind === "classic" ? 24 : 150, y: kind === "classic" ? 150 : 235 });
  const positionRef = useRef(position);
  const directionRef = useRef(kind === "classic" ? -1 : 1);
  const dragging = useRef<{ pointerId: number; dx: number; dy: number } | null>(null);
  const moved = useRef(false);
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(positionKey) || "null") as { x?: number; y?: number } | null;
      const next = saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)
        ? { x: saved.x!, y: saved.y! }
        : { x: kind === "classic" ? Math.max(12, window.innerWidth - sizePx - 24) : 18, y: kind === "classic" ? Math.max(100, window.innerHeight - 170) : Math.max(210, window.innerHeight - 300) };
      positionRef.current = next;
      setPosition(next);
    } catch { /* retain safe initial position */ }
  }, [kind, positionKey, sizePx]);

  useEffect(() => {
    const playbackSpeed = mode === "sit" ? .22 : speed === "slow" ? .65 : speed === "fast" ? 1.55 : 1;
    lottieRef.current?.setSpeed(playbackSpeed);
  }, [animationData, mode, speed]);

  useEffect(() => {
    if (mode !== "automatic") return;
    const step = speed === "slow" ? .8 : speed === "fast" ? 2.2 : 1.35;
    let tick = kind === "classic" ? 0 : 47;
    const timer = window.setInterval(() => {
      tick += 1;
      if (tick % 95 === 0) { setReaction(true); window.setTimeout(() => setReaction(false), 900); }
      setPosition((current) => {
        let x = current.x + directionRef.current * step;
        if (x <= 8) { x = 8; directionRef.current = 1; setFacingRight(true); }
        if (x >= window.innerWidth - sizePx) { x = window.innerWidth - sizePx; directionRef.current = -1; setFacingRight(false); }
        const next = { ...current, x }; positionRef.current = next; return next;
      });
    }, kind === "classic" ? 60 : 72);
    return () => window.clearInterval(timer);
  }, [kind, mode, sizePx, speed]);

  return (
    <div
      className="fixed z-[90] touch-none select-none"
      style={{ left: position.x, bottom: position.y }}
      onPointerDown={(event) => { moved.current = false; dragging.current = { pointerId: event.pointerId, dx: event.clientX - position.x, dy: event.clientY + position.y }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={(event) => {
        if (!dragging.current || dragging.current.pointerId !== event.pointerId) return;
        moved.current = true;
        const next = { x: Math.max(6, Math.min(window.innerWidth - sizePx, event.clientX - dragging.current.dx)), y: Math.max(86, Math.min(window.innerHeight - 90, dragging.current.dy - event.clientY)) };
        positionRef.current = next; setPosition(next);
      }}
      onPointerUp={(event) => {
        dragging.current = null; event.currentTarget.releasePointerCapture(event.pointerId); localStorage.setItem(positionKey, JSON.stringify(positionRef.current));
        if (!moved.current) { setReaction(true); window.setTimeout(() => setReaction(false), 1400); }
      }}
      role="button"
      aria-label={`Interactive Daily Hisab ${kind} pet cat`}
    >
      {reaction && <span className="pet-heart absolute -right-1 -top-5 text-2xl text-[#ef476f]">♥</span>}
      <div className={`pet-body pet-mode-${mode} ${reaction ? "pet-loved" : ""} grid place-items-center`} style={{ width: sizePx, height: sizePx }}>
        {kind === "classic" && animationData && <Lottie lottieRef={lottieRef} animationData={animationData} loop autoplay style={{ width: sizePx, height: sizePx, transform: facingRight ? "scaleX(-1)" : "none" }} />}
        {kind === "mewmew" && <Image src="/pet/mewmew.gif" alt="MewMew pixel cat" width={sizePx} height={sizePx} unoptimized draggable={false} className="mewmew-pet" style={{ width: sizePx, height: sizePx, transform: facingRight ? "scaleX(-1)" : "none" }} />}
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

export function FloatingPet() {
  const [enabled, setEnabled] = useState(false);
  const [color, setColor] = useState<PetColor>("default");
  const [petSize, setPetSize] = useState<PetSize>("medium");
  const [petMode, setPetMode] = useState<PetMode>("default");
  const [petSpeed, setPetSpeed] = useState<PetSpeed>("normal");
  const [petVariant, setPetVariant] = useState<PetVariant>("mewmew");
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    const load = () => {
      setEnabled(localStorage.getItem(PET_ENABLED_KEY) !== "0");
      const savedColor = localStorage.getItem(PET_COLOR_KEY); setColor((["brown", "default", "black", "white"].includes(savedColor || "") ? savedColor : "default") as PetColor);
      const savedSize = localStorage.getItem(PET_SIZE_KEY); setPetSize((["small", "medium", "large"].includes(savedSize || "") ? savedSize : "medium") as PetSize);
      const savedMode = localStorage.getItem(PET_MODE_KEY); setPetMode((["automatic", "default", "sit"].includes(savedMode || "") ? savedMode : "default") as PetMode);
      const savedSpeed = localStorage.getItem(PET_SPEED_KEY); setPetSpeed((["slow", "normal", "fast"].includes(savedSpeed || "") ? savedSpeed : "normal") as PetSpeed);
      const savedVariant = localStorage.getItem(PET_VARIANT_KEY); setPetVariant(savedVariant === "classic" || savedVariant === "both" ? savedVariant : "mewmew");
    };
    load(); window.addEventListener(PET_SETTINGS_EVENT, load); return () => window.removeEventListener(PET_SETTINGS_EVENT, load);
  }, []);

  useEffect(() => {
    if (petVariant === "mewmew") return;
    const suffix = color === "default" ? "" : `-${color}`;
    fetch(`/pet/walking-cat${suffix}.json`).then((response) => response.json()).then((data: object) => setAnimationData(data)).catch(() => setAnimationData(null));
  }, [color, petVariant]);

  if (!enabled) return null;
  const classicSize = petSize === "small" ? 72 : petSize === "large" ? 124 : 92;
  const mewMewSize = petSize === "small" ? 120 : petSize === "large" ? 240 : 180;
  return <>
    {(petVariant === "classic" || petVariant === "both") && <PetActor kind="classic" sizePx={classicSize} mode={petMode} speed={petSpeed} animationData={animationData} />}
    {(petVariant === "mewmew" || petVariant === "both") && <PetActor kind="mewmew" sizePx={mewMewSize} mode={petMode} speed={petSpeed} animationData={null} />}
  </>;
}
