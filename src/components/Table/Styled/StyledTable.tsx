import { styled } from "@mui/material";
import { colord } from "colord";

export const StyledTable = styled("div")(({ theme }) => ({
  "--cell-background-color":
    theme.palette.mode === "light"
      ? theme.palette.background.paper
      : colord(theme.palette.background.paper)
          .mix("#fff", 0.04)
          .alpha(1)
          .toHslString(),
  "--row-hover-background-color": colord(theme.palette.background.paper)
    .mix(theme.palette.action.hover, theme.palette.action.hoverOpacity)
    .alpha(1)
    .toHslString(),

  ...(theme.typography.caption as any),
  lineHeight: "inherit !important",

  "& [role='columnheader'], & [role='gridcell']": {
    "&[aria-selected='true']": {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: "-2px",
    },
    "&[data-drag-fill-target='true']": {
      outline: `1px dashed ${theme.palette.primary.main}`,
      outlineOffset: "-1px",
      backgroundColor: colord(theme.palette.background.paper)
        .mix(theme.palette.primary.main, theme.palette.action.selectedOpacity)
        .alpha(1)
        .toHslString(),
    },
    "&:focus": {
      outlineWidth: "3px",
      outlineOffset: "-3px",
    },
  },

  "& .cell-fill-handle": {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 8,
    height: 8,
    backgroundColor: theme.palette.primary.main,
    border: `1px solid ${theme.palette.background.paper}`,
    cursor: "crosshair",
    zIndex: 3,
  },

  "& [data-frozen='left']": {
    position: "sticky",
    left: 0,
    zIndex: 2,

    "&[data-frozen-last='true']": {
      boxShadow: theme.shadows[2]
        .replace(/, 0 (\d+px)/g, ", $1 0")
        .split("),")
        .slice(1)
        .join("),"),
      clipPath: "inset(0 -4px 0 0)",
    },
  },
}));
StyledTable.displayName = "StyledTable";

export default StyledTable;
