import { motion, useMotionValue, useTransform, useMotionTemplate } from "motion/react";
import { ArrowUpRight } from "lucide-react";

/** Scroll-revealed CTA for the "TintWord" app, off-set to the left. */
export function TintWordCTA() {
  const x = useMotionValue(0);
  
  // Rotate the word slightly as it's dragged (like a physical flashcard)
  const rotate = useTransform(x, [-250, 0, 250], [-10, 0, 10]);
  
  // Tint the word based on swipe direction: 
  // Left (Forget/Die) = Rose Red, Center = Transparent, Right (Remember/Das) = Emerald Green
  const auraColor = useTransform(
    x,
    [-200, 0, 200],
    ["rgba(225, 29, 72, 0.8)", "rgba(0, 0, 0, 0)", "rgba(16, 185, 129, 0.8)"]
  );
  
  // Create a stunning text shadow that acts like a glowing aura
  const textShadow = useMotionTemplate`0px 10px 80px ${auraColor}, 0px 2px 20px ${auraColor}`;

  return (
    <section className="relative mx-auto w-full max-w-[1400px] px-6 pt-[6vh] pb-[18vh] md:py-[18vh] md:px-16">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.8 }}
        className="relative max-w-[760px] md:ml-[8%]"
      >
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
          className="mb-6 font-mono uppercase tracking-[0.32em] text-accent"
          style={{ fontSize: 12 }}
        >
          (Now live)
        </motion.p>

        {/* Interactive Swipeable Title */}
        <motion.div
          style={{ x, rotate }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.6}
          dragTransition={{ bounceStiffness: 400, bounceDamping: 20 }}
          className="inline-block cursor-grab active:cursor-grabbing relative"
        >
          <motion.h2
            whileHover={{ scale: 1.02, rotate: -1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex font-serif leading-[0.92] tracking-[-0.02em] origin-bottom"
            style={{ fontSize: "clamp(3rem, 9vw, 8rem)", fontWeight: 300, textShadow }}
          >
            {"TintWord".split("").map((c, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ opacity: 0, y: 80, rotate: 6 }}
                whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.7, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              >
                {c}
              </motion.span>
            ))}
          </motion.h2>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-8 max-w-[460px] text-muted-foreground"
          style={{ fontSize: "1.05rem", lineHeight: 1.6 }}
        >
          An intuitive German vocabulary app that paints language as colour. Powered by the FSRS algorithm, it leverages visual memory for noun genders (Der, Die, Das)—turning grammar into a fluid palette you can feel.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-12 flex flex-wrap items-center gap-8"
        >
          <a
            href="https://tintword.jliu.eu"
            data-cursor="Open"
            className="group inline-flex items-center gap-3 border-b border-foreground/30 pb-2 transition-colors hover:border-accent"
          >
            <span className="font-mono uppercase tracking-[0.2em]" style={{ fontSize: 13 }}>
              Learn more
            </span>
            <ArrowUpRight
              size={20}
              className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-accent"
            />
          </a>

          <a
            href="https://play.google.com/store/apps/details?id=eu.jliu.tintword"
            target="_blank"
            rel="noopener noreferrer"
            data-cursor="Download"
            className="group inline-flex items-center gap-3 border-b border-foreground/30 pb-2 transition-colors hover:border-accent"
          >
            <span className="font-mono uppercase tracking-[0.2em]" style={{ fontSize: 13 }}>
              Google Play
            </span>
            <ArrowUpRight
              size={20}
              className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-accent"
            />
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
