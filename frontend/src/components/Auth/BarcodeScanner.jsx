import { useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";

const BarcodeScanner = ({ onScan }) => {
  useEffect(() => {
    const scanner = new Html5Qrcode("reader");

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (decodedText) => {
        onScan(decodedText);
        scanner.stop();
      },
      () => {}
    );

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [onScan]);

  return <div id="reader" style={{ width: "300px" }} />;
};

export default BarcodeScanner;