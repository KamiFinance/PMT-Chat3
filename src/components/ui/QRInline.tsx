// @ts-nocheck
import React, { useEffect, useRef } from 'react';

export default function QRInline({ address }: { address: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !address) return;
    ref.current.innerHTML = '';

    const generate = () => {
      if (!(window as any).QRCode) return;
      new (window as any).QRCode(ref.current, {
        text: address,
        width: 180,
        height: 180,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: (window as any).QRCode.CorrectLevel.M,
      });
    };

    if ((window as any).QRCode) {
      generate();
    } else {
      // Load qrcodejs dynamically
      if (!document.getElementById('qrcodejs')) {
        const script = document.createElement('script');
        script.id = 'qrcodejs';
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
        script.onload = generate;
        document.head.appendChild(script);
      } else {
        const t = setInterval(() => {
          if ((window as any).QRCode) { clearInterval(t); generate(); }
        }, 100);
        return () => clearInterval(t);
      }
    }
  }, [address]);

  return <div ref={ref} />;
}
