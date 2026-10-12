"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Slide } from "./slides";

const W = 1920;
const H = 1080;
const IDLE_MS = 2200;

export function DeckViewer({ slides }: { slides: Slide[] }) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(0.5);
  const [full, setFull] = useState(false);
  const [canFull, setCanFull] = useState(false);
  const [notes, setNotes] = useState(false);
  const [idle, setIdle] = useState(false);

  const last = slides.length - 1;
  const go = useCallback((n: number) => setIndex(Math.max(0, Math.min(last, n))), [last]);

  // start from the slide named in the url hash, so a refresh keeps your place
  useEffect(() => {
    const n = parseInt(window.location.hash.slice(1), 10);
    if (!Number.isNaN(n)) setIndex(Math.max(0, Math.min(last, n - 1)));
    setCanFull(Boolean(document.fullscreenEnabled));
  }, [last]);

  useEffect(() => {
    window.history.replaceState(null, "", `#${index + 1}`);
  }, [index]);

  // fit the 1920x1080 canvas into whatever room the stage has
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => setScale(Math.min(el.clientWidth / W, el.clientHeight / H));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [notes, full]);

  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.current?.requestFullscreen();
  }, []);

  useEffect(() => {
    const onChange = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (["ArrowRight", "PageDown", " ", "Enter"].includes(e.key)) go(index + 1);
      else if (["ArrowLeft", "PageUp", "Backspace"].includes(e.key)) go(index - 1);
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(last);
      else if (e.key === "f" || e.key === "F") toggleFull();
      else if (e.key === "n" || e.key === "N") setNotes((v) => !v);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, last, toggleFull]);

  // hide the bar and cursor in full screen once the pointer stops moving
  const wake = useCallback(() => {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), IDLE_MS);
  }, []);
  useEffect(() => {
    wake();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [wake, full]);

  const slide = slides[index];

  return (
    <div ref={root} className="dk-root" data-full={full} data-idle={full && idle} onMouseMove={wake} onTouchStart={wake}>
      <div ref={stage} className="dk-stage">
        <div className="dk-frame" style={{ width: W * scale, height: H * scale }}>
          <div className="dk-canvas" style={{ transform: `scale(${scale})` }} dangerouslySetInnerHTML={{ __html: slide.html }} />
        </div>
      </div>

      {notes && !full && <div className="dk-notes">{slide.notes || "No speaker notes for this slide."}</div>}

      <div className="dk-bar">
        <button onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous slide">
          Prev
        </button>
        <span className="dk-count">
          {index + 1} / {slides.length}
        </span>
        <button onClick={() => go(index + 1)} disabled={index === last} aria-label="Next slide">
          Next
        </button>
        <span className="dk-spacer" />
        <span className="dk-hint">arrow keys to move, F for full screen, N for notes</span>
        <button onClick={() => setNotes((v) => !v)} aria-pressed={notes}>
          Notes
        </button>
        {canFull && (
          <button className="dk-full" onClick={toggleFull}>
            {full ? "Exit full screen" : "Full screen"}
          </button>
        )}
      </div>
    </div>
  );
}
