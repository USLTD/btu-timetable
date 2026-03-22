import { space } from "./tokens";

type GapValue = keyof typeof space | string;

function resolveGapValue(value: GapValue) {
  return typeof value === "string" ? value : space[value];
}

export function stackY(gap: keyof typeof space) {
  return {
    "& > * + *": {
      marginTop: space[gap],
    },
  };
}

export function stackX(gap: keyof typeof space) {
  return {
    "& > * + *": {
      marginLeft: space[gap],
    },
  };
}

export function wrapGap(gap: keyof typeof space) {
  const value = space[gap];
  return {
    margin: `-${value}`,
    "& > *": {
      margin: value,
    },
  };
}

export function inlineGridGap(gapX: keyof typeof space, gapY: keyof typeof space) {
  return {
    marginLeft: `-${space[gapX]}`,
    marginTop: `-${space[gapY]}`,
    "& > *": {
      marginLeft: space[gapX],
      marginTop: space[gapY],
    },
  };
}

export function flexGap(gap: GapValue, mode: "row" | "column" | "wrap" = "row") {
  const value = resolveGapValue(gap);
  const fallback =
    mode === "wrap"
      ? {
          margin: `-${value}`,
          "& > *": {
            margin: value,
          },
        }
      : mode === "column"
        ? {
            "& > * + *": {
              marginTop: value,
            },
          }
        : {
            "& > * + *": {
              marginLeft: value,
            },
          };
  return {
    gap: value,
    "@supports not (gap: 1rem)": fallback,
  };
}
