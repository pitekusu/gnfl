interface TitleScreenProps {
  onStart: () => void;
}

export function TitleScreen({ onStart }: TitleScreenProps) {
  return (
    <section className="screen" aria-label="Title">
      <div className="screen-panel">
        <h2>GNFL</h2>
        <p>
          架空の再処理工程ゲーム。v0.1 の完成対象は、係留済み専用船からの使用済燃料容器
          荷揚げ工程です。
        </p>
        <p>Phase 0: リポジトリ基盤 — React シェル上に Phaser Canvas を表示します。</p>
        <button type="button" className="primary-button" onClick={onStart}>
          Open Game Canvas
        </button>
      </div>
    </section>
  );
}
