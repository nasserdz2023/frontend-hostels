import { Inter, Tajawal } from "next/font/google";

export const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
    fallback: ["system-ui", "-apple-system", "sans-serif"],
});

export const tajawal = Tajawal({
    weight: ["300", "400", "500", "700", "800", "900"],
    subsets: ["arabic"],
    variable: "--font-tajawal",
    display: "swap",
    fallback: ["system-ui", "sans-serif"],
});
