/**
 * Utility for playing sounds in the application
 */
import confetti from "canvas-confetti";

// Check if audio is supported in this browser
export const canPlayAudio = () => {
    return (
        typeof window !== "undefined" &&
        (window.AudioContext || window.webkitAudioContext)
    );
};

// Play a success sound when order is completed
export const playSuccessSound = () => {
    if (!canPlayAudio()) return;

    try {
        // Create an AudioContext
        const audioContext = new (window.AudioContext ||
            window.webkitAudioContext)();

        // Create orchestrated sounds for a more satisfying effect
        // Main success chord
        const mainOscillator = audioContext.createOscillator();
        const mainGain = audioContext.createGain();
        mainOscillator.connect(mainGain);
        mainGain.connect(audioContext.destination);

        // Configure the oscillator
        mainOscillator.type = "sine";
        mainGain.gain.value = 0.2; // Keep volume moderate

        // Chord sequence - first note
        mainOscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        mainOscillator.start();

        // Second note (E5)
        setTimeout(() => {
            const secondOsc = audioContext.createOscillator();
            const secondGain = audioContext.createGain();
            secondOsc.connect(secondGain);
            secondGain.connect(audioContext.destination);
            secondOsc.type = "sine";
            secondGain.gain.value = 0.2;
            secondOsc.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
            secondOsc.start();

            // Fade out
            secondGain.gain.exponentialRampToValueAtTime(
                0.001,
                audioContext.currentTime + 1.5
            );
            setTimeout(() => secondOsc.stop(), 1500);
        }, 100);

        // Third note (G5)
        setTimeout(() => {
            const thirdOsc = audioContext.createOscillator();
            const thirdGain = audioContext.createGain();
            thirdOsc.connect(thirdGain);
            thirdGain.connect(audioContext.destination);
            thirdOsc.type = "sine";
            thirdGain.gain.value = 0.2;
            thirdOsc.frequency.setValueAtTime(783.99, audioContext.currentTime); // G5
            thirdOsc.start();

            // Fade out
            thirdGain.gain.exponentialRampToValueAtTime(
                0.001,
                audioContext.currentTime + 2
            );
            setTimeout(() => thirdOsc.stop(), 2000);
        }, 200);

        // Fade out the main oscillator
        mainGain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + 1
        );
        setTimeout(() => mainOscillator.stop(), 1000);
    } catch (e) {
        console.log("Sound could not be played", e);
    }
};

// Play celebration jingle
export const playFinalizeSound = () => {
    if (!canPlayAudio()) return;

    try {
        const audioContext = new (window.AudioContext ||
            window.webkitAudioContext)();

        // Play a short melody
        const playNote = (
            frequency,
            startTime,
            duration,
            type = "sine",
            gain = 0.2
        ) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(
                frequency,
                audioContext.currentTime + startTime
            );
            gainNode.gain.setValueAtTime(gain, audioContext.currentTime + startTime);

            // Start and stop
            oscillator.start(audioContext.currentTime + startTime);

            // Fade out to avoid clicking
            gainNode.gain.exponentialRampToValueAtTime(
                0.001,
                audioContext.currentTime + startTime + duration
            );

            oscillator.stop(audioContext.currentTime + startTime + duration + 0.05);
        };

        // Play a celebratory melody
        playNote(440, 0, 0.2); // A4
        playNote(523.25, 0.2, 0.2); // C5
        playNote(659.25, 0.4, 0.2); // E5
        playNote(880, 0.6, 0.5); // A5

        // Add a bit of percussion using noise
        setTimeout(() => {
            const bufferSize = 2 * audioContext.sampleRate;
            const noiseBuffer = audioContext.createBuffer(
                1,
                bufferSize,
                audioContext.sampleRate
            );
            const output = noiseBuffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const noise = audioContext.createBufferSource();
            noise.buffer = noiseBuffer;

            const noiseGain = audioContext.createGain();
            noiseGain.gain.value = 0.03; // Very low volume

            const filter = audioContext.createBiquadFilter();
            filter.type = "highpass";
            filter.frequency.value = 5000;

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(audioContext.destination);

            noise.start();

            noiseGain.gain.exponentialRampToValueAtTime(
                0.001,
                audioContext.currentTime + 0.3
            );
            setTimeout(() => noise.stop(), 300);
        }, 600);
    } catch (e) {
        console.log("Finalize sound could not be played", e);
    }
};

// Enhanced confetti patterns
export const fireConfetti = {
    basic: () => {
        confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.6 },
        });
    },

    sides: () => {
        const colors = [
            "#2563eb",
            "#10b981",
            "#f59e0b",
            "#ef4444",
            "#8b5cf6",
            "#ec4899",
        ];

        // Left side
        confetti({
            particleCount: 25,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.65 },
            colors: colors,
        });

        // Right side
        setTimeout(() => {
            confetti({
                particleCount: 25,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.65 },
                colors: colors,
            });
        }, 250);
    },

    celebration: () => {
        // Intense burst
        const end = Date.now() + 800; // Shorter duration
        const colors = [
            "#2563eb",
            "#10b981",
            "#f59e0b",
            "#ef4444",
            "#8b5cf6",
            "#ec4899",
        ];

        (function frame() {
            confetti({
                particleCount: 100, // Reduced from 200
                spread: 80,
                origin: { y: 0.6 },
                colors: colors,
                shapes: ["circle", "square"],
                scalar: 1.2,
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        })();
    },
};
