import React, { useEffect, useState } from "react";
import Pitchfinder from "pitchfinder";

export default function LivePitch() {
  const [pitch, setPitch] = useState(null);

  useEffect(() => {
    let audioContext;
    let analyzer;
    let microphone;

    async function startMonitoring() {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyzer = audioContext.createAnalyser();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyzer);

      // Pitchfinder Algorithm (YIN)
      const detectPitch = Pitchfinder.YIN();

      const buffer = new Float32Array(analyzer.fftSize);

      function updatePitch() {
        analyzer.getFloatTimeDomainData(buffer);
        const detected = detectPitch(buffer);

        if (detected) {
          setPitch(Math.round(detected));
        }

        requestAnimationFrame(updatePitch);
      }

      updatePitch();
    }

    startMonitoring();

    return () => {
      audioContext && audioContext.close();
    };
  }, []);

  return (
    <div style={{ padding: "40px", fontSize: "24px" }}>
      <h2>🎤 실시간 피치 측정</h2>
      {pitch ? (
        <p>현재 음 높이: <strong>{pitch} Hz</strong></p>
      ) : (
        <p>소리를 입력하세요...</p>
      )}
    </div>
  );
}
