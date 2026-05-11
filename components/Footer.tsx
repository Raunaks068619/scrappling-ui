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
              src="/scrapling-cover.svg"
              alt="Scrapling"
              width={88}
              height={20}
              className={styles.scraplingLogo}
            />
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
