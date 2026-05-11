import Image from "next/image";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.foot}>
      <div className={styles.inner}>
        <p className={styles.left}>
          <span>built on</span>
          <a
            href="https://github.com/D4Vinci/Scrapling"
            target="_blank"
            rel="noreferrer noopener"
            className={styles.brandedLink}
          >
            <Image
              src="/scrapling-mark.png"
              alt="Scrapling"
              width={20}
              height={20}
              className={styles.scraplingLogo}
            />
            <span className={styles.scraplingName}>Scrapling</span>
          </a>
        </p>
        <p className={styles.right}>
          <a href="https://github.com/D4Vinci/Scrapling#readme" target="_blank" rel="noreferrer noopener">
            Scrapling docs
          </a>
        </p>
      </div>
    </footer>
  );
}
