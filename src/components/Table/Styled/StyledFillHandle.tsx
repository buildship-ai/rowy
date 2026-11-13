import { styled } from "@mui/material";

/**
 * Small square rendered at the bottom-right corner of the selected cell.
 * Dragging it fills the cells below (or above) with the cell’s value.
 */
export const StyledFillHandle = styled("div")(({ theme }) => ({
  position: "absolute",
  right: 2,
  bottom: 2,
  width: 8,
  height: 8,
  borderRadius: 2,
  backgroundColor: theme.palette.primary.main,
  cursor: "crosshair",
  zIndex: 2,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

StyledFillHandle.displayName = "StyledFillHandle";

export default StyledFillHandle;
