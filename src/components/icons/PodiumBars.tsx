import { SVGProps } from "react";

export function PodiumBarsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="4" y="12.2" width="4.6" height="7.6" rx="1.6" />
      <rect x="10" y="6.2" width="4.6" height="13.6" rx="1.6" />
      <rect x="16" y="9.2" width="4.6" height="10.6" rx="1.6" />
    </svg>
  );
}
