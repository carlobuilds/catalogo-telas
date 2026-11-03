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
