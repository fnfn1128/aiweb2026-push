"use client";

import React from "react";

const GLASS_TIMING = "cubic-bezier(0.175, 0.885, 0.32, 2.2)";

export interface GlassEffectProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  href?: string;
  target?: string;
  rel?: string;
  /** 파일 다운로드용 `download` 속성 (설정 시 `target` 기본값 없음) */
  download?: string | boolean;
  /** false면 정적 패널(커서 기본) */
  interactive?: boolean;
}

export const GlassEffect: React.FC<GlassEffectProps> = ({
  children,
  className = "",
  style = {},
  href,
  target,
  rel,
  download,
  interactive,
}) => {
  const isInteractive =
    interactive ?? (!!href && download === undefined);

  const glassStyle: React.CSSProperties = {
    boxShadow:
      "0 6px 6px rgba(0, 0, 0, 0.2), 0 0 20px rgba(0, 0, 0, 0.1)",
    transitionTimingFunction: GLASS_TIMING,
    ...style,
  };

  const content = (
    <div
      className={`relative flex overflow-hidden font-semibold text-slate-900 transition-all duration-700 ${isInteractive ? "cursor-pointer" : "cursor-default"} ${className}`}
      style={glassStyle}
    >
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-inherit"
        style={{
          backdropFilter: "blur(3px)",
          filter: "url(#glass-distortion)",
          isolation: "isolate",
        }}
      />
      <div
        className="absolute inset-0 z-10 rounded-inherit"
        style={{ background: "rgba(255, 255, 255, 0.22)" }}
      />
      <div
        className="absolute inset-0 z-20 overflow-hidden rounded-inherit"
        style={{
          boxShadow:
            "inset 2px 2px 1px 0 rgba(255, 255, 255, 0.45), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.35)",
        }}
      />
      <div className="relative z-30 w-full min-w-0">{children}</div>
    </div>
  );

  if (href) {
    const downloadAttr =
      download === true ? "" : download !== undefined ? download : undefined;
    const defaultTarget = downloadAttr !== undefined ? undefined : target ?? "_blank";
    const defaultRel =
      downloadAttr !== undefined
        ? undefined
        : (rel ?? "noopener noreferrer");

    return (
      <a
        href={href}
        target={defaultTarget}
        rel={defaultRel}
        download={downloadAttr}
        className="inline-block"
      >
        {content}
      </a>
    );
  }

  return content;
};

export interface DockIcon {
  src: string;
  alt: string;
  onClick?: () => void;
}

export const GlassDock: React.FC<{ icons: DockIcon[]; href?: string }> = ({
  icons,
  href,
}) => (
  <GlassEffect
    href={href}
    className="rounded-3xl p-3 hover:p-4"
  >
    <div className="flex items-center justify-center gap-2 overflow-hidden rounded-3xl px-0.5 py-0">
      {icons.map((icon) => (
        <img
          key={`${icon.src}-${icon.alt}`}
          src={icon.src}
          alt={icon.alt}
          width={64}
          height={64}
          className="h-14 w-14 cursor-pointer transition-all duration-700 hover:scale-110 sm:h-16 sm:w-16"
          style={{
            transformOrigin: "center center",
            transitionTimingFunction: GLASS_TIMING,
          }}
          onClick={icon.onClick}
        />
      ))}
    </div>
  </GlassEffect>
);

export type GlassCTAProps = {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
};

/** 바깥 래퍼: 알약형 글래스와 같은 라운드 + 포커스 링 (기본 사각형 outline 방지) */
const glassCtaShellClass =
  "rounded-full outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

/** 링크 또는 버튼 모두 지원하는 리퀴드 글래스 CTA */
export const GlassCTA: React.FC<GlassCTAProps> = ({
  children,
  href,
  onClick,
  disabled,
  type = "button",
  className = "",
}) => {
  const inner = (
    <GlassEffect
      className={`rounded-full px-8 py-3.5 hover:px-9 hover:py-4 ${disabled ? "opacity-50" : ""} ${className}`}
    >
      <div
        className={`transition-all duration-700 ${disabled ? "" : "hover:scale-95"}`}
        style={{ transitionTimingFunction: GLASS_TIMING }}
      >
        {children}
      </div>
    </GlassEffect>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-block ${glassCtaShellClass} ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-block w-full appearance-none border-0 bg-transparent p-0 sm:w-auto disabled:cursor-not-allowed ${glassCtaShellClass}`}
    >
      {inner}
    </button>
  );
};

export const GlassFilter: React.FC = () => (
  <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden>
    <filter
      id="glass-distortion"
      x="0%"
      y="0%"
      width="100%"
      height="100%"
      filterUnits="objectBoundingBox"
    >
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.001 0.005"
        numOctaves={1}
        seed={17}
        result="turbulence"
      />
      <feComponentTransfer in="turbulence" result="mapped">
        <feFuncR type="gamma" amplitude={1} exponent={10} offset={0.5} />
        <feFuncG type="gamma" amplitude={0} exponent={1} offset={0} />
        <feFuncB type="gamma" amplitude={0} exponent={1} offset={0.5} />
      </feComponentTransfer>
      <feGaussianBlur in="turbulence" stdDeviation={3} result="softMap" />
      <feSpecularLighting
        in="softMap"
        surfaceScale={5}
        specularConstant={1}
        specularExponent={100}
        lightingColor="white"
        result="specLight"
      >
        <fePointLight x="-200" y="-200" z="300" />
      </feSpecularLighting>
      <feComposite
        in="specLight"
        operator="arithmetic"
        k1={0}
        k2={1}
        k3={1}
        k4={0}
        result="litImage"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="softMap"
        scale={200}
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  </svg>
);

/** 정적 콘텐츠용 패널 */
export function GlassPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <GlassEffect
      interactive={false}
      className={`w-full rounded-3xl p-6 sm:p-8 ${className}`}
    >
      {children}
    </GlassEffect>
  );
}
