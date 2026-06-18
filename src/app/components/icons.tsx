/**
 * Xiaohongshu (RED) mark — the brand is most recognizable by its 小红书
 * wordmark, so we render the characters tightly set rather than an abstract glyph.
 */
export function XiaohongshuIcon({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        fontSize: size * 0.62,
        lineHeight: 1,
        fontWeight: 700,
        letterSpacing: "-0.04em",
        fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      }}
    >
      小红书
    </span>
  );
}
