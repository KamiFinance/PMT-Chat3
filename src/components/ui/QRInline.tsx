// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function QRInline({ address }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !address) return;
    QRCode.toCanvas(canvasRef.current, address || 'no-address', {
      width: 180,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).catch(err => console.error('QR error:', err));
  }, [address]);

  return <canvas ref={canvasRef} style={{ display: 'block' }} />;
}
