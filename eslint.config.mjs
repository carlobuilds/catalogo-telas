import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**", "Fotos_Telas/**", "next-env.d.ts"],
  },
  {
    // Los iconos salen SOLO de components/ui/iconos.tsx: ahí vive la política
    // de peso (bold) y de accesibilidad, y el import SSR-safe de Phosphor.
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "lucide-react", message: "Usa @/components/ui/iconos (Phosphor)." },
            { name: "@phosphor-icons/react", message: "Usa @/components/ui/iconos." },
          ],
          patterns: [{ group: ["@phosphor-icons/react/*"], message: "Usa @/components/ui/iconos." }],
        },
      ],
    },
  },
  {
    files: ["components/ui/iconos.tsx"],
    rules: { "no-restricted-imports": "off" },
  },
];

export default eslintConfig;
