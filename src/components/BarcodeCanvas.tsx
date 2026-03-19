import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  format?: string;
}

export function BarcodeCanvas({ value, width = 1.5, height = 40, displayValue = true, fontSize = 12, format = "CODE128" }: BarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          displayValue,
          fontSize,
          margin: 4,
          lineColor: "#1a1a2e",
          background: "#ffffff",
        });
      } catch {
        // fallback for invalid input
      }
    }
  }, [value, width, height, displayValue, fontSize, format]);

  return <svg ref={svgRef} />;
}
