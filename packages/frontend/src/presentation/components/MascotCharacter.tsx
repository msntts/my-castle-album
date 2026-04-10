import styles from './MascotCharacter.module.css';

interface Props {
  imageSrc?: string;
  alt?: string;
}

export function MascotCharacter({ imageSrc, alt = 'マスコット' }: Props) {
  return (
    <div className={styles.mascot}>
      {imageSrc ? (
        <img src={imageSrc} alt={alt} className={styles.image} />
      ) : (
        <div className={styles.placeholder} title={alt}>
          🏯
        </div>
      )}
    </div>
  );
}
