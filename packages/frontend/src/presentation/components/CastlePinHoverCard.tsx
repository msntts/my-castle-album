import styles from './CastlePinHoverCard.module.css';

interface Props {
  name: string;
  thumbnailUrl?: string;
}

export function CastlePinHoverCard({ name, thumbnailUrl }: Props) {
  return (
    <div className={styles.card}>
      {thumbnailUrl && (
        <img src={thumbnailUrl} alt={name} className={styles.thumbnail} />
      )}
      <p className={styles.name}>{name}</p>
    </div>
  );
}
