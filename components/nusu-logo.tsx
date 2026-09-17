"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export interface NusuLogoProps {
  size?: "sm" | "default" | "lg"
  showText?: boolean
  className?: string
  href?: string
}

export function NusuLogo({
  size = "default",
  showText = true,
  className,
  href,
}: NusuLogoProps) {
  const sizeConfig = {
    sm: {
      emblemHeight: 26,
      emblemWidth: 21,
      titleSize: "text-[17px]",
      subtitleSize: "text-[7.5px] tracking-[0.24em]",
      gap: "gap-2.5",
    },
    default: {
      emblemHeight: 36,
      emblemWidth: 29,
      titleSize: "text-2xl",
      subtitleSize: "text-[9.5px] tracking-[0.25em]",
      gap: "gap-3",
    },
    lg: {
      emblemHeight: 52,
      emblemWidth: 42,
      titleSize: "text-3xl sm:text-4xl",
      subtitleSize: "text-xs sm:text-sm tracking-[0.26em]",
      gap: "gap-3.5",
    },
  }[size]

  const content = (
    <div
      className={cn(
        "inline-flex items-center select-none",
        sizeConfig.gap,
        className
      )}
    >
      {/* Emblem SVG with exact Nile University Student Union vectors */}
      <svg
        width={sizeConfig.emblemWidth}
        height={sizeConfig.emblemHeight}
        viewBox="15 10 102 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-colors duration-300"
        aria-hidden="true"
      >
        {/* Lower Arch 'n' (Light: Navy #143459, Dark: White #FFFFFF) */}
        <path
          d="M101.27 55.4726C108.264 60.9616 111.894 68.2653 113 77C113.133 80.7688 113.116 84.534 113.098 88.3047C113.096 89.3838 113.095 90.4629 113.093 91.5747C113.088 95.0082 113.075 98.4416 113.062 101.875C113.057 104.208 113.053 106.542 113.049 108.875C113.038 114.583 113.021 120.292 113 126C107.39 126 101.78 126 96 126C95.9854 124.517 95.9708 123.034 95.9558 121.505C95.8977 115.992 95.8205 110.48 95.7375 104.967C95.7043 102.583 95.6763 100.199 95.6535 97.8149C95.6199 94.3841 95.5676 90.954 95.5117 87.5234C95.5053 86.4607 95.4989 85.398 95.4923 84.3031C95.3841 78.8331 95.1864 74.6661 92 70C86.5149 65.7719 81.907 64.2791 75 65C70.3 66.7173 67.7904 68.8661 65 73C64.0276 75.9172 63.8483 77.888 63.7947 80.9304C63.7747 81.9312 63.7548 82.932 63.7342 83.9632C63.7175 85.0414 63.7008 86.1196 63.6836 87.2305C63.6628 88.336 63.642 89.4416 63.6206 90.5806C63.5551 94.1162 63.4962 97.6518 63.4375 101.187C63.3943 103.583 63.3507 105.978 63.3066 108.373C63.1995 114.249 63.0982 120.124 63 126C57.39 126 51.78 126 46 126C45.8507 118.672 45.7423 111.344 45.6704 104.015C45.6404 101.526 45.5995 99.0377 45.5473 96.5493C45.4739 92.9545 45.4404 89.3611 45.414 85.7656C45.3831 84.6682 45.3521 83.5709 45.3202 82.4402C45.3162 73.1766 48.0514 65.5418 54.1793 58.4932C66.0845 46.6738 87.5727 46.5851 101.27 55.4726Z"
          className="fill-[#143459] transition-colors duration-300 dark:fill-white"
        />

        {/* Upper Left curve of 'u' (Light: Cyan #068DCE, Dark: White #FFFFFF) */}
        <path
          d="M21 13C26.61 13 32.22 13 38 13C38.0146 14.4832 38.0292 15.9665 38.0442 17.4946C38.1022 23.0076 38.1795 28.5201 38.2625 34.0327C38.2957 36.4168 38.3237 38.8009 38.3464 41.1851C38.38 44.6159 38.4324 48.046 38.4883 51.4766C38.4947 52.5393 38.5011 53.602 38.5076 54.6969C38.6192 60.3345 39.137 64.0183 42 69C42.2488 71.3335 42.2488 71.3335 42.0742 73.5234C42.0194 74.3162 41.9646 75.109 41.9082 75.9258C41.8354 76.734 41.7625 77.5423 41.6875 78.375C41.6263 79.2064 41.565 80.0379 41.502 80.8945C41.3498 82.9309 41.177 84.9657 41 87C32.6497 84.4749 28.2544 80.1828 24.043 72.6367C21.0571 65.0882 20.722 57.6585 20.8047 49.6211C20.8075 48.5684 20.8103 47.5157 20.8133 46.4312C20.8244 43.0998 20.8495 39.7688 20.875 36.4375C20.885 34.166 20.8942 31.8945 20.9023 29.623C20.9243 24.0819 20.9588 18.541 21 13Z"
          className="fill-[#068DCE] transition-colors duration-300 dark:fill-white"
        />

        {/* Upper Right vertical of 'u' (Light: Cyan #048DCE, Dark: White #FFFFFF) */}
        <path
          d="M71 13C76.61 13 82.22 13 88 13C88 23.56 88 34.12 88 45C82.39 45 76.78 45 71 45C71 34.44 71 23.88 71 13Z"
          className="fill-[#068DCE] transition-colors duration-300 dark:fill-white"
        />

        {/* Bottom curve of 'u' (Light: Cyan #0A8FCF, Dark: White #FFFFFF) */}
        <path
          d="M82 69C82.99 69.33 83.98 69.66 85 70C84.2031 75.8745 81.2103 79.0222 77 83C71.4401 87 71.4401 87 68 87C67.6073 76.9877 67.6073 76.9877 70 73C73.8318 68.9492 76.5201 68.4926 82 69Z"
          className="fill-[#068DCE] transition-colors duration-300 dark:fill-white"
        />

        {/* Dot inside 'u' (Light: Navy #143459, Dark: White #FFFFFF) */}
        <circle
          cx="55.5"
          cy="34.5"
          r="8.5"
          className="fill-[#143459] transition-colors duration-300 dark:fill-white"
        />
      </svg>

      {/* Typography: NUSU + STUDENT UNION */}
      {showText && (
        <div className="flex flex-col justify-center">
          <span
            className={cn(
              "font-heading leading-none font-black tracking-tight transition-colors duration-300",
              "text-[#143459] dark:text-white",
              sizeConfig.titleSize
            )}
          >
            NUSU
          </span>
          <span
            className={cn(
              "mt-0.5 font-sans leading-none font-bold uppercase transition-colors duration-300",
              "text-[#068DCE] dark:text-white",
              sizeConfig.subtitleSize
            )}
          >
            STUDENT UNION
          </span>
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="flex items-center transition-opacity hover:opacity-90 active:scale-[0.98]"
        aria-label="Nile University Student Union Home"
      >
        {content}
      </Link>
    )
  }

  return content
}
