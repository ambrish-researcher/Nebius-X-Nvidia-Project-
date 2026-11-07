"use client";
import dynamic from "next/dynamic";

const GridScan = dynamic(() => import("./grid-scan"), { ssr: false });

/** Shared green scan field for the landing page and all simulation lessons. */
export default function SiteBackground() {
  return (
    <div className="site-grid-background" aria-hidden="true">
      <GridScan
        linesColor="#2f6840"
        scanColor="#9fe06b"
        cells={6}
        depth={2}
        parallax={0.18}
        points={false}
        reflection={0.12}
        scanDuration={5.2}
        glow={0.34}
        clickEffect="none"
        enableWebcam={false}
        showPreview={false}
        enableGyro={false}
        intro={false}
        dpr={1}
        maxFps={30}
      />
    </div>
  );
}
