import { useEffect, useRef, useState } from 'react';

export function LoadingGame() {
    const canvasRef = useRef(null);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        // Game state
        const bits = [];
        const mouse = { x: -100, y: -100 };
        let frameCount = 0;

        // Resize handler
        const resize = () => {
            const parent = canvas.parentElement;
            canvas.width = parent.clientWidth;
            canvas.height = 300; // Fixed height for the game area
        };
        resize();
        window.addEventListener('resize', resize);

        // Mouse handler
        const handleMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        };
        canvas.addEventListener('mousemove', handleMouseMove);

        // Game Loop
        const render = () => {
            frameCount++;

            // Spawn bits
            if (frameCount % 10 === 0 && bits.length < 20) {
                bits.push({
                    x: Math.random() * canvas.width,
                    y: canvas.height + 10,
                    speed: 1 + Math.random() * 2,
                    size: 4 + Math.random() * 6,
                    color: Math.random() > 0.5 ? '#2563EB' : '#60A5FA', // Blue shades
                    value: Math.floor(Math.random() * 10) + 1
                });
            }

            // Clear
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw background grid
            ctx.strokeStyle = '#F3F4F6';
            ctx.beginPath();
            for (let i = 0; i < canvas.width; i += 40) { ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); }
            for (let i = 0; i < canvas.height; i += 40) { ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); }
            ctx.stroke();

            // Update and draw bits
            for (let i = bits.length - 1; i >= 0; i--) {
                const bit = bits[i];
                bit.y -= bit.speed;

                // Draw
                ctx.fillStyle = bit.color;
                ctx.beginPath();
                ctx.arc(bit.x, bit.y, bit.size, 0, Math.PI * 2);
                ctx.fill();

                // Collision check
                const dx = mouse.x - bit.x;
                const dy = mouse.y - bit.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < bit.size + 20) { // Mouse radius 20
                    // Collect
                    setScore(s => {
                        const newScore = s + bit.value;
                        setHighScore(h => Math.max(h, newScore));
                        return newScore;
                    });

                    // Sparkle effect (simple)
                    ctx.fillStyle = '#FCD34D';
                    ctx.beginPath();
                    ctx.arc(bit.x, bit.y, 10, 0, Math.PI * 2);
                    ctx.fill();

                    bits.splice(i, 1);
                } else if (bit.y < -20) {
                    // Out of bounds
                    bits.splice(i, 1);
                }
            }

            // Draw Mouse Cursor Area
            ctx.strokeStyle = '#2563EB';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 20, 0, Math.PI * 2);
            ctx.stroke();

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB', background: '#FAFAFA' }}>
            <canvas ref={canvasRef} style={{ display: 'block', cursor: 'none' }} />

            <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,0.9)', padding: '4px 12px', borderRadius: 20, fontSize: 14, fontWeight: 600, color: '#2563EB', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                Bytes Collected: {score}
            </div>

            <div style={{ position: 'absolute', bottom: 16, width: '100%', textAlign: 'center', color: '#9CA3AF', fontSize: 13, pointerEvents: 'none' }}>
                Move your cursor to collect data bits!
            </div>
        </div>
    );
}
