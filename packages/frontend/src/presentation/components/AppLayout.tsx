import type { ReactNode } from 'react';
import styles from './AppLayout.module.css';

interface Props {
  mapContent: ReactNode;
  overlayContent?: ReactNode;
  mascot?: ReactNode;
}

export function AppLayout({ mapContent, overlayContent, mascot }: Props) {
  return (
    <div className={styles.layout}>
      <div className={styles.mapArea}>{mapContent}</div>
      {overlayContent && (
        <div className={styles.overlay}>{overlayContent}</div>
      )}
      {mascot && <div className={styles.mascot}>{mascot}</div>}
    </div>
  );
}
