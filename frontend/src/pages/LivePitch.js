import React, { useEffect, useRef, useState } from "react";
import Pitchfinder from "pitchfinder";




export default function LivePitch() {
  const [frequency, setFrequency] = useState(null);
  const [note, setNote] = useState(null);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);

  // ----------------------------------------
  //   Hz → 음계로 변환 (C, D#, A 등)
  // ----------------------------------------
  const getNoteFromFrequency = (freq) => {
    if (!freq) return null;

    const A4 = 440; 
    const noteNames = [
      "C", "C#", "D", "D#", "E",
      "F", "F#", "G", "G#", "A", "A#", "B"
    ];

    const semitone = 12 * (Math.log(freq / A4) / Math.log(2));
    const noteIndex = Math.round(semitone) + 57; // A4 = index 57

    const octave = Math.floor(noteIndex / 12);
    const noteName = noteNames[noteIndex % 12];

    return `${noteName}${octave}`;
  };

  useEffect(() => {
    async function startMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyserRef.current = analyser;

        source.connect(analyser);

        const bufferLength = analyser.fftSize;
        const dataArray = new Float32Array(bufferLength);
        dataArrayRef.current = dataArray;

        // Pitchfinder YIN 알고리즘
        const detectPitch = Pitchfinder.YIN({ sampleRate: audioContext.sampleRate });

        const loop = () => {
          analyser.getFloatTimeDomainData(dataArray);
          const freq = detectPitch(dataArray);

          if (freq) {
            setFrequency(freq.toFixed(1));
            setNote(getNoteFromFrequency(freq));
          } else {
            setFrequency(null);
            setNote(null);
          }

          requestAnimationFrame(loop);
        };

        loop();
      } catch (err) {
        console.error("Mic access error:", err);
      }
    }

    startMic();
  }, []);

 return (
  <div style={styles.container}>
    <h1 style={styles.title}>🎤 Live Pitch Monitor</h1>

    <div style={styles.box}>
      <p style={styles.label}>Frequency (Hz)</p>
      <p style={styles.value}>{frequency ? `${frequency} Hz` : "--"}</p>
    </div>

    <div style={styles.box}>
      <p style={styles.label}>Musical Note</p>
      <p style={styles.value}>{note ? note : "--"}</p>
    </div>
  </div>
);

}

// ---------------------------------------------
//           간단한 스타일
// ---------------------------------------------
const styles = {
  container: {
    padding: "50px",
    textAlign: "center",
    color: "#fff",
    background: "linear-gradient(135deg, #0D1B3D, #102C5B)",
    height: "100vh"
  },
  title: {
    fontSize: "40px",
    marginBottom: "40px",
    fontWeight: "700"
  },
  box: {
    margin: "20px auto",
    padding: "20px",
    width: "300px",
    background: "rgba(255,255,255,0.1)",
    borderRadius: "12px",
    backdropFilter: "blur(6px)",
  },
  label: {
    fontSize: "18px",
    opacity: 0.9,
  },
  value: {
    fontSize: "32px",
    marginTop: "8px",
    fontWeight: "700",
  }
};
