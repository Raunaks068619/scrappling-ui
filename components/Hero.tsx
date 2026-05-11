import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero}>
      <p className={`${styles.eyebrow} eyebrow`}>v0.1 · single page · BYO URL</p>
      <h1 className={styles.headline}>Scrape anything.</h1>
      <p className={`${styles.lede} lede`}>
        Paste a URL. We render it with a stealth browser, clean the noise, and
        hand back JSON and Markdown — same shape every time.
      </p>
    </section>
  );
}
