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
    // `eslint .` recorre todo el árbol (antes `next lint` solo veía app/,
    // components/ y lib/). Fuera: lo generado, las carpetas de fotos (no son
    // código, pesan GB) y `.claude/`, donde viven los worktrees, que son
    // copias completas del repo.
    ignores: [
      ".next/**",
      "node_modules/**",
      ".claude/**",
      "next-env.d.ts",
      "components/ui/iconos/**",
      "FOTOS_TELAS/**",
      "Fotos_Telas/**",
      "Fotos_Entrada*/**",
      "0Fotos_nobg/**",
    ],
  },
  {
    // Los iconos salen SOLO de @/components/ui/iconos (generado por
    // `pnpm iconos`): un Phosphor importado directo trae sus seis pesos al
    // bundle y se salta la política de components/ui/IconoBase.tsx.
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
    // Los únicos que leen Phosphor: el generador y la prueba que lo compara.
    files: ["scripts/generar-iconos.ts", "components/ui/iconos.test.ts"],
    rules: { "no-restricted-imports": "off" },
  },
];

export default eslintConfig;
