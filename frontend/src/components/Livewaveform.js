import React, { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";


export default function LiveWaveform() {
  const containerRef = useRef(null);
  const waveSurferRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    waveSurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#88aaff",
      progressColor: "#5577dd",
      cursorColor: "transparent",
      height: 100,
      responsive: true,

      plugins: [
        MicrophonePlugin.create() // ★ v6 방식
      ],
    });

    // 마이크 시작
    waveSurferRef.current.microphone.start();

    return () => {
      try {
        waveSurferRef.current.microphone.stop();
      } catch (e) {}
      waveSurferRef.current.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100px",
        background: "#0D1B3D",
        borderRadius: "12px",
        marginTop: "30px",
      }}
    ></div>
  );
}

