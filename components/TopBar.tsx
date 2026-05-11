import Image from "next/image";
import styles from "./TopBar.module.css";
import { AccentDot } from "./icons/ScraplingMark";

export function TopBar() {
  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <a href="/" className={styles.brand} aria-label="Scrape Anything — home">
          <span className={styles.wordmark}>Scrape Anything</span>
          <AccentDot />
        </a>
        <div className={styles.meta}>
          <span>via</span>
          <a
            href="https://github.com/D4Vinci/Scrapling"
            target="_blank"
            rel="noreferrer noopener"
            className={styles.brandedLink}
          >
            <Image
              src="/scrapling-cover.svg"
              alt="Scrapling"
              width={88}
              height={20}
              priority
              className={styles.scraplingLogo}
            />
          </a>
          <span className={styles.sep}>·</span>
          <span>Stealthy</span>
        </div>
      </div>
    </header>
  );
}
