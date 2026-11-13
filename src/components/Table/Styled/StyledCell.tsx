import { styled } from "@mui/material";

export const StyledCell = styled("div")(({ theme }) => ({
  position: "relative",
  display: "flex",
  alignItems: "center",
  lineHeight: "calc(var(--row-height) - 1px)",
  whiteSpace: "nowrap",
  "--cell-padding": theme.spacing(10 / 8),

  "& > .cell-contents": {
    padding: "0 var(--cell-padding)",
    width: "100%",
    height: "100%",
    contain: "strict",
    overflow: "hidden",

    display: "flex",
    alignItems: "center",
  },

  "& > .cell-contents-contain-none": {
    padding: "0 var(--cell-padding)",
    width: "100%",
    height: "100%",
    contain: "none",
    overflow: "hidden",

    display: "flex",
    alignItems: "center",
  },

  backgroundColor: "var(--cell-background-color)",

  border: `1px solid ${theme.palette.divider}`,
  borderTop: "none",
  "& + &": { borderLeft: "none" },

  "[role='row']:hover &": {
    backgroundColor: "var(--row-hover-background-color)",
  },

  "[data-out-of-order='true'] + [role='row'] &": {
    borderTop: `1px solid ${theme.palette.divider}`,
  },

  "&[aria-invalid='true'] .cell-contents": {
    outline: `2px dotted ${theme.palette.error.main}`,
    outlineOffset: -2,
  },

  "&[data-fill-target='true']": {
    boxShadow: `inset 0 0 0 2px ${theme.palette.primary.main}`,
  },
}));
StyledCell.displayName = "StyledCell";

export default StyledCell;
