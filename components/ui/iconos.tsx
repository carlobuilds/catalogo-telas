/**
 * Vocabulario de iconos del sitio — Phosphor (https://phosphoricons.com).
 * ===========================================================================
 * El ÚNICO lugar desde donde se importan iconos, igual que `lib/unidades.ts`
 * es el único vocabulario de unidades. Dos razones:
 *
 * 1. Se importa del build SSR de Phosphor (`/dist/ssr/<Icono>`), que no usa
 *    contexto de React: el mismo icono sirve en Server y Client Components sin
 *    pensar en qué lado corre el archivo. La raíz `@phosphor-icons/react` usa
 *    `IconContext` y truena en un Server Component.
 *    Se importa icono por icono para no arrastrar los ~1,500 del índice.
 *
 * 2. La política visual se aplica aquí, una vez:
 *    - Peso `bold` por defecto. El `regular` de Phosphor traza 1.5px a 24px,
 *      más fino que el lucide que reemplaza (2px); para quien tiene 40+ y ve
 *      la pantalla de una tablet a medio brazo, un icono delgado se pierde.
 *    - `fill` para estados ACTIVOS (pestaña actual, filtro puesto, portada) —
 *      se pasa explícito: `<Star weight="fill" />`.
 *    - `duotone` solo en ilustraciones de estados vacíos (40px o más).
 *    - Decorativo por defecto (`aria-hidden`): el texto del botón ya dice qué
 *      hace. Si el icono va SOLO, pásale `aria-label` y deja de ser invisible.
 *
 * Cada `conEstilo(...)` va marcado `@__PURE__`: sin la marca, el bundler no
 * puede probar que la llamada no tiene efectos y manda los 57 iconos a cada
 * página aunque use dos (medido: +39 kB de JS en la portada).
 *
 * El tamaño va con clases (`className="h-5 w-5"` o `size-5`): las clases de
 * Tailwind le ganan al `width/height="1em"` que Phosphor pone de atributo.
 * Un icono que falta se agrega aquí, nunca importándolo directo en un
 * componente.
 * ===========================================================================
 */
import { forwardRef } from "react";
import type { Icon, IconProps } from "@phosphor-icons/react/dist/lib/types";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import { ArrowDownIcon } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { ArrowsOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowsOut";
import { BarricadeIcon } from "@phosphor-icons/react/dist/ssr/Barricade";
import { BasketIcon } from "@phosphor-icons/react/dist/ssr/Basket";
import { CameraPlusIcon } from "@phosphor-icons/react/dist/ssr/CameraPlus";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { CircleNotchIcon } from "@phosphor-icons/react/dist/ssr/CircleNotch";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ClockCounterClockwise";
import { CropIcon } from "@phosphor-icons/react/dist/ssr/Crop";
import { DiamondIcon } from "@phosphor-icons/react/dist/ssr/Diamond";
import { DotsSixVerticalIcon } from "@phosphor-icons/react/dist/ssr/DotsSixVertical";
import { EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { FunnelXIcon } from "@phosphor-icons/react/dist/ssr/FunnelX";
import { GearIcon } from "@phosphor-icons/react/dist/ssr/Gear";
import { GridNineIcon } from "@phosphor-icons/react/dist/ssr/GridNine";
import { HandSwipeRightIcon } from "@phosphor-icons/react/dist/ssr/HandSwipeRight";
import { ImageIcon } from "@phosphor-icons/react/dist/ssr/Image";
import { ImageBrokenIcon } from "@phosphor-icons/react/dist/ssr/ImageBroken";
import { ListChecksIcon } from "@phosphor-icons/react/dist/ssr/ListChecks";
import { LockSimpleIcon } from "@phosphor-icons/react/dist/ssr/LockSimple";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { MagnifyingGlassMinusIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlassMinus";
import { MagnifyingGlassPlusIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlassPlus";
import { MinusIcon } from "@phosphor-icons/react/dist/ssr/Minus";
import { NeedleIcon } from "@phosphor-icons/react/dist/ssr/Needle";
import { PencilRulerIcon } from "@phosphor-icons/react/dist/ssr/PencilRuler";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { QuestionIcon } from "@phosphor-icons/react/dist/ssr/Question";
import { RainbowIcon } from "@phosphor-icons/react/dist/ssr/Rainbow";
import { RulerIcon } from "@phosphor-icons/react/dist/ssr/Ruler";
import { SealCheckIcon } from "@phosphor-icons/react/dist/ssr/SealCheck";
import { LinkSimpleIcon } from "@phosphor-icons/react/dist/ssr/LinkSimple";
import { ProhibitIcon } from "@phosphor-icons/react/dist/ssr/Prohibit";
import { ShareNetworkIcon } from "@phosphor-icons/react/dist/ssr/ShareNetwork";
import { ShieldWarningIcon } from "@phosphor-icons/react/dist/ssr/ShieldWarning";
import { ShoppingBagIcon } from "@phosphor-icons/react/dist/ssr/ShoppingBag";
import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { SquaresFourIcon } from "@phosphor-icons/react/dist/ssr/SquaresFour";
import { StarIcon } from "@phosphor-icons/react/dist/ssr/Star";
import { SwatchesIcon } from "@phosphor-icons/react/dist/ssr/Swatches";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { TrendDownIcon } from "@phosphor-icons/react/dist/ssr/TrendDown";
import { WarehouseIcon } from "@phosphor-icons/react/dist/ssr/Warehouse";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { WhatsappLogoIcon } from "@phosphor-icons/react/dist/ssr/WhatsappLogo";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";

export type { Icon, IconProps };

function conEstilo(Base: Icon, nombre: string): Icon {
  const Icono = forwardRef<SVGSVGElement, IconProps>(function Icono(props, ref) {
    const etiquetado = props["aria-label"] != null || props.alt != null;
    return (
      <Base
        ref={ref}
        weight="bold"
        aria-hidden={etiquetado ? undefined : true}
        role={etiquetado ? "img" : undefined}
        focusable="false"
        {...props}
      />
    );
  });
  Icono.displayName = nombre;
  return Icono;
}

export const ArrowClockwise = /* @__PURE__ */ conEstilo(ArrowClockwiseIcon, "ArrowClockwise");
export const ArrowCounterClockwise = /* @__PURE__ */ conEstilo(ArrowCounterClockwiseIcon, "ArrowCounterClockwise");
export const ArrowDown = /* @__PURE__ */ conEstilo(ArrowDownIcon, "ArrowDown");
export const ArrowLeft = /* @__PURE__ */ conEstilo(ArrowLeftIcon, "ArrowLeft");
export const ArrowRight = /* @__PURE__ */ conEstilo(ArrowRightIcon, "ArrowRight");
export const ArrowSquareOut = /* @__PURE__ */ conEstilo(ArrowSquareOutIcon, "ArrowSquareOut");
export const ArrowsLeftRight = /* @__PURE__ */ conEstilo(ArrowsLeftRightIcon, "ArrowsLeftRight");
export const ArrowsOut = /* @__PURE__ */ conEstilo(ArrowsOutIcon, "ArrowsOut");
export const Barricade = /* @__PURE__ */ conEstilo(BarricadeIcon, "Barricade");
export const Basket = /* @__PURE__ */ conEstilo(BasketIcon, "Basket");
export const CameraPlus = /* @__PURE__ */ conEstilo(CameraPlusIcon, "CameraPlus");
export const CaretDown = /* @__PURE__ */ conEstilo(CaretDownIcon, "CaretDown");
export const CaretLeft = /* @__PURE__ */ conEstilo(CaretLeftIcon, "CaretLeft");
export const CaretRight = /* @__PURE__ */ conEstilo(CaretRightIcon, "CaretRight");
export const Check = /* @__PURE__ */ conEstilo(CheckIcon, "Check");
export const CheckCircle = /* @__PURE__ */ conEstilo(CheckCircleIcon, "CheckCircle");
export const CircleNotch = /* @__PURE__ */ conEstilo(CircleNotchIcon, "CircleNotch");
export const ClockCounterClockwise = /* @__PURE__ */ conEstilo(ClockCounterClockwiseIcon, "ClockCounterClockwise");
export const Crop = /* @__PURE__ */ conEstilo(CropIcon, "Crop");
export const Diamond = /* @__PURE__ */ conEstilo(DiamondIcon, "Diamond");
export const DotsSixVertical = /* @__PURE__ */ conEstilo(DotsSixVerticalIcon, "DotsSixVertical");
export const Eye = /* @__PURE__ */ conEstilo(EyeIcon, "Eye");
export const FunnelX = /* @__PURE__ */ conEstilo(FunnelXIcon, "FunnelX");
export const Gear = /* @__PURE__ */ conEstilo(GearIcon, "Gear");
export const GridNine = /* @__PURE__ */ conEstilo(GridNineIcon, "GridNine");
export const HandSwipeRight = /* @__PURE__ */ conEstilo(HandSwipeRightIcon, "HandSwipeRight");
export const Image = /* @__PURE__ */ conEstilo(ImageIcon, "Image");
export const ImageBroken = /* @__PURE__ */ conEstilo(ImageBrokenIcon, "ImageBroken");
export const ListChecks = /* @__PURE__ */ conEstilo(ListChecksIcon, "ListChecks");
export const LockSimple = /* @__PURE__ */ conEstilo(LockSimpleIcon, "LockSimple");
export const MagnifyingGlass = /* @__PURE__ */ conEstilo(MagnifyingGlassIcon, "MagnifyingGlass");
export const MagnifyingGlassMinus = /* @__PURE__ */ conEstilo(MagnifyingGlassMinusIcon, "MagnifyingGlassMinus");
export const MagnifyingGlassPlus = /* @__PURE__ */ conEstilo(MagnifyingGlassPlusIcon, "MagnifyingGlassPlus");
export const Minus = /* @__PURE__ */ conEstilo(MinusIcon, "Minus");
export const Needle = /* @__PURE__ */ conEstilo(NeedleIcon, "Needle");
export const PencilRuler = /* @__PURE__ */ conEstilo(PencilRulerIcon, "PencilRuler");
export const PencilSimple = /* @__PURE__ */ conEstilo(PencilSimpleIcon, "PencilSimple");
export const Plus = /* @__PURE__ */ conEstilo(PlusIcon, "Plus");
export const Question = /* @__PURE__ */ conEstilo(QuestionIcon, "Question");
export const Rainbow = /* @__PURE__ */ conEstilo(RainbowIcon, "Rainbow");
export const Ruler = /* @__PURE__ */ conEstilo(RulerIcon, "Ruler");
export const SealCheck = /* @__PURE__ */ conEstilo(SealCheckIcon, "SealCheck");
export const LinkSimple = /* @__PURE__ */ conEstilo(LinkSimpleIcon, "LinkSimple");
export const Prohibit = /* @__PURE__ */ conEstilo(ProhibitIcon, "Prohibit");
export const ShareNetwork = /* @__PURE__ */ conEstilo(ShareNetworkIcon, "ShareNetwork");
export const ShieldWarning = /* @__PURE__ */ conEstilo(ShieldWarningIcon, "ShieldWarning");
export const ShoppingBag = /* @__PURE__ */ conEstilo(ShoppingBagIcon, "ShoppingBag");
export const SignOut = /* @__PURE__ */ conEstilo(SignOutIcon, "SignOut");
export const SlidersHorizontal = /* @__PURE__ */ conEstilo(SlidersHorizontalIcon, "SlidersHorizontal");
export const Sparkle = /* @__PURE__ */ conEstilo(SparkleIcon, "Sparkle");
export const SquaresFour = /* @__PURE__ */ conEstilo(SquaresFourIcon, "SquaresFour");
export const Star = /* @__PURE__ */ conEstilo(StarIcon, "Star");
export const Swatches = /* @__PURE__ */ conEstilo(SwatchesIcon, "Swatches");
export const Trash = /* @__PURE__ */ conEstilo(TrashIcon, "Trash");
export const TrendDown = /* @__PURE__ */ conEstilo(TrendDownIcon, "TrendDown");
export const Warehouse = /* @__PURE__ */ conEstilo(WarehouseIcon, "Warehouse");
export const Warning = /* @__PURE__ */ conEstilo(WarningIcon, "Warning");
export const WhatsappLogo = /* @__PURE__ */ conEstilo(WhatsappLogoIcon, "WhatsappLogo");
export const X = /* @__PURE__ */ conEstilo(XIcon, "X");
