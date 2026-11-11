import { TransitionGroup } from "react-transition-group";

import { Box, Grid, Collapse } from "@mui/material";

import SectionHeading from "@src/components/SectionHeading";
import TableCard from "./TableCard";
import SlideTransition from "@src/components/Modal/SlideTransition";

import { TableSettings } from "@src/types/table";

export const MAX_SECTION_ANIMATION_TIMEOUT_MS = 300;
export const MAX_TABLE_ANIMATION_TIMEOUT_MS = 350;
export const EXIT_ANIMATION_TIMEOUT_MS = 100;

export function computeSectionAnimationTimeout(sectionIndex: number): number {
  return Math.min(
    Math.max(0, sectionIndex + 1) * 75,
    MAX_SECTION_ANIMATION_TIMEOUT_MS
  );
}

export function computeTableCardAnimationTimeout(
  sectionIndex: number,
  tableIndex: number
): { enter: number; exit: number } {
  const enter = Math.min(
    Math.max(0, sectionIndex + 1) * 50 + Math.max(0, tableIndex) * 25,
    MAX_TABLE_ANIMATION_TIMEOUT_MS
  );
  return { enter, exit: EXIT_ANIMATION_TIMEOUT_MS };
}

export interface ITableGridProps {
  sections: Record<string, TableSettings[]>;
  getLink: (table: TableSettings) => string;
  getActions?: (table: TableSettings) => React.ReactNode;
}

export default function TableGrid({
  sections,
  getLink,
  getActions,
}: ITableGridProps) {
  return (
    <TransitionGroup>
      {Object.entries(sections).map(
        ([sectionName, sectionTables], sectionIndex) => {
          const sectionTimeout = computeSectionAnimationTimeout(sectionIndex);
          const tableItems = sectionTables
            .map((table, tableIndex) => {
              if (!table) return null;

              return (
                <SlideTransition
                  key={table.id}
                  appear
                  timeout={computeTableCardAnimationTimeout(
                    sectionIndex,
                    tableIndex
                  )}
                >
                  <Grid item xs={12} sm={6} md={4} lg={3}>
                    <TableCard
                      {...table}
                      link={getLink(table)}
                      actions={getActions ? getActions(table) : null}
                    />
                  </Grid>
                </SlideTransition>
              );
            })
            .filter((item) => item !== null);

          if (tableItems.length === 0) return null;

          return (
            <Collapse key={sectionName} timeout={EXIT_ANIMATION_TIMEOUT_MS}>
              <Box component="section" sx={{ mt: 4 }}>
                <SlideTransition
                  key={"grid-section-" + sectionName}
                  in
                  timeout={sectionTimeout}
                >
                  <SectionHeading sx={{ pl: 2, pr: 1.5 }}>
                    {sectionName}
                  </SectionHeading>
                </SlideTransition>

                <Grid component={TransitionGroup} container spacing={2}>
                  {tableItems}
                </Grid>
              </Box>
            </Collapse>
          );
        }
      )}
    </TransitionGroup>
  );
}
