"use client";

import { GlassFilter } from "@/components/ui/liquid-glass";
import { Warp } from "@paper-design/shaders-react";
import type { ReactNode } from "react";

type WarpShaderHeroProps = {
  children: ReactNode;
};

export default function WarpShaderHero({ children }: WarpShaderHeroProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <GlassFilter />
      <div className="absolute inset-0">
        <Warp
          style={{ height: "100%", width: "100%" }}
          proportion={0.45}
          softness={1}
          distortion={0.25}
          swirl={0.8}
          swirlIterations={10}
          shape="checks"
          shapeScale={0.1}
          scale={1}
          rotation={0}
          speed={1}
          colors={[
            "hsl(200, 100%, 20%)",
            "hsl(160, 100%, 75%)",
            "hsl(180, 90%, 30%)",
            "hsl(170, 100%, 80%)",
          ]}
        />
      </div>

      <div className="relative z-10 min-h-screen w-full">{children}</div>
    </div>
  );
}
