import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

/* ------------------------------------------------------------------ *
 *  TIME SCRUBBER  ·  education + career
 *
 *  Resting: a single ink hairline across the screen.
 *  Engage (hover on desktop / drag on touch): the line splits into
 *  Morandi grey-green (education) + grey-blue (career) lanes that
 *  *draw themselves in*, and a playhead follows the pointer — reading
 *  out the exact month you're hovering and naming every role that was
 *  alive at that instant. Scrub your finger across a life.
 * ------------------------------------------------------------------ */

const EDU = "#94A89A"; // morandi grey-green
const JOB = "#8FA0B3"; // morandi grey-blue

type Track = "edu" | "job";

type Entry = {
  id: string;
  track: Track;
  start: number; // decimal year, Sep 2012 -> 2012.67
  end: number | null; // null = present
  title: string;
  role?: string; // e.g. "Intern", "Working Student" — kept on its own line
  detail?: string; // responsibilities / location
  range: string;
  lane?: number;
};

const y = (year: number, month: number) => year + (month - 1) / 12; // month 1-indexed
const NOW = y(2026, 6);

const ENTRIES: Entry[] = [
  // ---- education ----
  { id: "jm-mid", track: "edu", start: y(2012, 9), end: y(2015, 7), title: "Jimei Middle School", detail: "Xiamen", range: "Sep 2012 – Jul 2015" },
  { id: "jm-high", track: "edu", start: y(2015, 9), end: y(2018, 6), title: "Jimei High School", detail: "Xiamen", range: "Sep 2015 – Jun 2018" },
  { id: "hainan", track: "edu", start: y(2018, 9), end: y(2019, 1), title: "Hainan University", role: "Bachelor · Journalism & Communication", detail: "Haikou", range: "Sep 2018 – Jan 2019" },
  { id: "tongji", track: "edu", start: y(2019, 2), end: y(2019, 10), title: "Deutschkolleg · Tongji University", role: "German Course", detail: "Shanghai", range: "Feb 2019 – Oct 2019" },
  { id: "iik", track: "edu", start: y(2020, 2), end: y(2020, 9), title: "IIK Göttingen", role: "German Course", detail: "Göttingen", range: "Feb 2020 – Sep 2020" },
  { id: "fu", track: "edu", start: y(2020, 10), end: null, title: "Freie Universität Berlin", role: "Bachelor · Journalism & Communication", detail: "Minor Computer Science", range: "Oct 2020 – now" },
  // ---- career ----
  { id: "igindis", track: "job", start: y(2017, 7), end: y(2017, 9), title: "IGindis Games (Remote)", role: "Game Localization & Testing Support", range: "Jul 2017 – Sep 2017" },
  { id: "ccc", track: "job", start: y(2022, 6), end: y(2023, 2), title: "Chinese Cultural Center Berlin", role: "Intern", detail: "Social Media · Data Analysis · IT & Event Support", range: "Jun 2022 – Feb 2023" },
  { id: "changhong", track: "job", start: y(2022, 12), end: y(2025, 8), title: "Changhong Deutschland GmbH · Berlin", role: "Operations Working Student", detail: "Data Analysis & Reporting · IT Administration & Support · Accounting Support", range: "Dec 2022 – Aug 2025" },
  { id: "stategrid", track: "job", start: y(2026, 3), end: null, title: "State Grid China · European Rep. Office Berlin", role: "Working Student", detail: "External Communication · Research Assistance · Process Automation", range: "Mar 2026 – now" },
  { id: "tintword", track: "job", start: y(2026, 5), end: null, title: "Tintword", role: "Personal Android Vocabulary App", detail: "Berlin", range: "May 2026 – now" },
];

/* Greedy lane packing so concurrent roles fan onto parallel lines. */
function packLanes(items: Entry[]) {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  const laneEnds: number[] = [];
  for (const e of sorted) {
    let lane = laneEnds.findIndex((end) => end <= e.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    e.lane = lane;
    laneEnds[lane] = e.end ?? NOW;
  }
  return Math.max(1, laneEnds.length);
}

/* Compressed scale: 2000–2012 occupies the first PRE% of the width. */
const BREAK = 2012;
const START = 2000;
const PRE = 7;
const scale = (yr: number) =>
  yr <= BREAK
    ? ((yr - START) / (BREAK - START)) * PRE
    : PRE + ((yr - BREAK) / (NOW - BREAK)) * (100 - PRE);
const unscale = (pct: number) =>
  pct <= PRE
    ? START + (pct / PRE) * (BREAK - START)
    : BREAK + ((pct - PRE) / (100 - PRE)) * (NOW - BREAK);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(yr: number) {
  let yy = Math.floor(yr);
  let m = Math.round((yr - yy) * 12);
  if (m > 11) { m = 0; yy++; }
  if (m < 0) { m = 0; }
  return `${MONTHS[m]} ${yy}`;
}

const LANE_GAP = 16;
const TICKS = [2000, 2012, 2016, 2020, 2023, 2026];
const YEAR_RULER = Array.from({ length: NOW - START + 1 }, (_, i) => START + i);

export function CareerTimeline() {
  const [cx, setCx] = useState<number | null>(null); // pointer fraction 0..1
  const [held, setHeld] = useState(false); // touch drag in progress
  const railRef = useRef<HTMLDivElement>(null);

  const eduLanes = useMemo(() => packLanes(ENTRIES.filter((e) => e.track === "edu")), []);
  const jobLanes = useMemo(() => packLanes(ENTRIES.filter((e) => e.track === "job")), []);

  const active = cx !== null;
  const topPad = (eduLanes + jobLanes) * LANE_GAP + 10; // lanes live above the axis
  const botPad = 6;

  // education (green) nearest the axis, career (blue) stacked above
  const offsetFor = (e: Entry) =>
    e.track === "edu"
      ? -((e.lane ?? 0) + 1) * LANE_GAP
      : -(eduLanes * LANE_GAP + ((e.lane ?? 0) + 1) * LANE_GAP);

  const cursorYear = cx !== null ? unscale(cx * 100) : null;
  const liveEntries =
    cursorYear !== null
      ? ENTRIES.filter((e) => cursorYear >= e.start - 0.04 && cursorYear <= (e.end ?? NOW) + 0.04)
      : [];
  const liveIds = new Set(liveEntries.map((e) => e.id));

  const SNAP_YEARS = 0.25; // 3 months magnetic radius
  const readFrac = (clientX: number) => {
    const r = railRef.current?.getBoundingClientRect();
    if (!r) return 0;
    const rawFrac = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const rawYear = unscale(rawFrac * 100);
    
    let closestStart = rawYear;
    let minDiff = Infinity;
    for (const e of ENTRIES) {
      const diff = Math.abs(e.start - rawYear);
      if (diff < minDiff) {
        minDiff = diff;
        closestStart = e.start;
      }
    }

    if (minDiff < SNAP_YEARS) {
      return scale(closestStart) / 100;
    }
    return rawFrac;
  };

  // Desktop: drive the playhead from a window mouse listener with an explicit
  // hit-test against just the timeline band, so the read-out clears the instant
  // the cursor moves off the line (pointerleave can miss, esp. fast exits).
  const bandHeight = topPad + 30 + (topPad + botPad) + 34;
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const move = (e: MouseEvent) => {
      const r = railRef.current?.getBoundingClientRect();
      if (!r) return;
      const inX = e.clientX >= r.left && e.clientX <= r.right;
      const inY = e.clientY >= r.top && e.clientY <= r.top + bandHeight;
      if (inX && inY) {
        setCx(readFrac(e.clientX));
      } else {
        setCx((c) => (c === null ? c : null));
      }
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [bandHeight]);

  return (
    <section className="mx-auto w-full max-w-[1400px] px-6 md:px-16" aria-label="Timeline of education and work">
      <div
        ref={railRef}
        onPointerMove={(e) => { if (e.pointerType === "touch" && held) setCx(readFrac(e.clientX)); }}
        onPointerDown={(e) => { if (e.pointerType === "touch") { setHeld(true); setCx(readFrac(e.clientX)); } }}
        onPointerUp={() => { if (held) { setHeld(false); setCx(null); } }}
        onPointerCancel={() => { if (held) { setHeld(false); setCx(null); } }}
        className="relative mx-auto w-[92%] touch-none select-none"
        style={{ paddingTop: topPad + 30, paddingBottom: 24 }}
      >
        {/* legend */}
        <motion.div
          className="pointer-events-none absolute left-0 top-0 flex items-center gap-5 font-mono uppercase tracking-[0.22em] text-muted-foreground"
          style={{ fontSize: 9 }}
          animate={{ opacity: active ? 1 : 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className="flex items-center gap-1.5"><span className="inline-block h-[2px] w-4 rounded-full" style={{ background: EDU }} /> Education</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-[2px] w-4 rounded-full" style={{ background: JOB }} /> Career</span>
        </motion.div>

        {/* body */}
        <div className="relative" style={{ height: topPad + botPad }}>
          {/* faint per-year ruler — appears on engage, gives a measured feel */}
          {YEAR_RULER.map((t) => (
            <motion.span
              key={`r${t}`}
              className="pointer-events-none absolute w-px -translate-x-1/2 bg-foreground"
              style={{ left: `${scale(t)}%`, top: topPad - 3, height: 6 }}
              animate={{ opacity: active ? 0.12 : 0 }}
              transition={{ duration: 0.5, delay: active ? (scale(t) / 100) * 0.25 : 0 }}
            />
          ))}

          {/* base hairline / axis */}
          <motion.div
            className="absolute left-0 right-0 origin-left rounded-full bg-foreground"
            style={{ top: topPad, height: 1 }}
            animate={{ opacity: active ? 0.22 : 0.4 }}
          />

          {/* playhead */}
          <AnimatePresence>
            {active && cx !== null && (
              <motion.div
                className="pointer-events-none absolute"
                style={{ left: `${cx * 100}%`, top: 0, height: topPad }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <span className="absolute bottom-0 left-0 w-px -translate-x-1/2 bg-accent" style={{ height: topPad }} />
                <span className="absolute bottom-0 left-0 h-[6px] w-[6px] -translate-x-1/2 translate-y-1/2 rounded-full bg-accent" />
                {/* floating date chip */}
                <span
                  className={`absolute -top-1 -translate-y-full whitespace-nowrap font-mono uppercase tracking-[0.18em] text-accent ${cx > 0.85 ? "right-0 translate-x-0" : "left-0 -translate-x-1/2"}`}
                  style={{ fontSize: 10 }}
                >
                  {cursorYear !== null ? fmtDate(cursorYear) : ""}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* lane segments */}
          {ENTRIES.map((e) => {
            const x0 = scale(e.start);
            const w = Math.max(scale(e.end ?? NOW) - x0, 0.5);
            const color = e.track === "edu" ? EDU : JOB;
            const live = liveIds.has(e.id);
            const dim = active && liveIds.size > 0 && !live;
            return (
              <motion.div
                key={e.id}
                className="pointer-events-none absolute"
                style={{ left: `${x0}%`, width: `${w}%`, top: topPad, height: 10, marginTop: -5 }}
                initial={false}
                animate={{ y: active ? offsetFor(e) : 0, opacity: active ? 1 : 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 28 }}
              >
                {/* draw-in fill */}
                <motion.span
                  className="absolute left-0 top-1/2 w-full origin-left -translate-y-1/2 rounded-full"
                  style={{ background: color }}
                  animate={{ scaleX: active ? 1 : 0, height: live ? 4 : 2, opacity: dim ? 0.25 : 1 }}
                  transition={{ scaleX: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: active ? (x0 / 100) * 0.4 : 0 }, height: { duration: 0.2 }, opacity: { duration: 0.2 } }}
                />
                {/* start node */}
                <motion.span
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ left: 0, background: color }}
                  animate={{ width: live ? 7 : 4, height: live ? 7 : 4, opacity: dim ? 0.3 : 1, boxShadow: live ? `0 0 0 3px color-mix(in srgb, ${color} 28%, transparent)` : "0 0 0 0px transparent" }}
                  transition={{ duration: 0.2 }}
                />
              </motion.div>
            );
          })}

          {/* labelled year ticks — below the axis */}
          {TICKS.map((t) => (
            <motion.div
              key={t}
              className="pointer-events-none absolute -translate-x-1/2"
              style={{ left: `${scale(t)}%`, top: topPad + 2 }}
              animate={{ opacity: active ? 0.9 : 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className="absolute left-1/2 h-1.5 w-px -translate-x-1/2 bg-foreground/25" style={{ top: 2 }} />
              <span className="absolute left-1/2 -translate-x-1/2 font-mono tracking-[0.15em] text-muted-foreground" style={{ top: 12, fontSize: 9 }}>
                {String(t).slice(2)}
              </span>
            </motion.div>
          ))}
        </div>

        {/* read-out — stable centered block in normal flow, never edge-squeezed.
            Reserves its own height so it can't collide with the footer. */}
        <div className="pointer-events-none relative mt-9 grid justify-items-center items-start md:min-h-[180px]">
          <AnimatePresence>
            {active && liveEntries.length > 0 ? (
              <motion.div
                key={liveEntries.map((e) => e.id).join("-")}
                className="col-start-1 row-start-1 flex w-full max-w-[640px] flex-col items-center gap-3 text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                {[...liveEntries]
                  .sort((a, b) => (a.track === b.track ? 0 : a.track === "edu" ? -1 : 1))
                  .map((e) => (
                    <div key={e.id} className="flex flex-col items-center gap-0.5">
                      <span className="font-serif tracking-[-0.01em] text-balance text-foreground" style={{ fontSize: 16, fontWeight: 400 }}>
                        <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full mr-2 align-middle" style={{ background: e.track === "edu" ? EDU : JOB, transform: 'translateY(-2px)' }} />
                        {e.title}
                      </span>
                      <span className="font-mono uppercase tracking-[0.18em] text-muted-foreground" style={{ fontSize: 9 }}>{e.range}</span>
                      {e.role && (
                        <span className="flex max-w-[92%] flex-wrap justify-center gap-x-1.5 font-mono uppercase tracking-[0.16em]" style={{ fontSize: 10, color: e.track === "edu" ? EDU : JOB }}>
                          {e.role.split(" · ").map((part, i) => (
                            <span key={i} className="whitespace-nowrap">{i > 0 && <span className="mr-1.5 opacity-50">·</span>}{part}</span>
                          ))}
                        </span>
                      )}
                      {e.detail && (
                        <span className="flex max-w-[92%] flex-wrap justify-center gap-x-1.5 font-mono tracking-[0.04em] text-muted-foreground" style={{ fontSize: 10 }}>
                          {e.detail.split(" · ").map((part, i) => (
                            <span key={i} className="whitespace-nowrap">{i > 0 && <span className="mr-1.5 opacity-50">·</span>}{part}</span>
                          ))}
                        </span>
                      )}
                    </div>
                  ))}
              </motion.div>
            ) : active ? (
              <motion.span
                key="gap"
                className="col-start-1 row-start-1 whitespace-nowrap font-mono uppercase tracking-[0.3em] text-muted-foreground"
                style={{ fontSize: 9 }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 0.6, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                {cursorYear !== null && cursorYear < 2012.67 ? "Just a child" : ""}
              </motion.span>
            ) : (
              <motion.span
                key="hint"
                className="col-start-1 row-start-1 whitespace-nowrap font-mono uppercase tracking-[0.3em] text-muted-foreground"
                style={{ fontSize: 9 }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 0.6, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                drag across — a life in time
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
