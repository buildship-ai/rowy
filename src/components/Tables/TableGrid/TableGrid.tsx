import { TransitionGroup } from "react-transition-group";

import { Box, Grid, Collapse } from "@mui/material";

import SectionHeading from "@src/components/SectionHeading";
import TableCard from "./TableCard";
import SlideTransition from "@src/components/Modal/SlideTransition";

import { TableSettings } from "@src/types/table";

export interface ITableGridProps {
  sections: Record<string, TableSettings[]>;
  getLink: (table: TableSettings) => string;
  getActions?: (table: TableSettings) => React.ReactNode;
}

export const MAX_SECTION_TRANSITION_TIMEOUT_MS = 300;
export const MAX_TABLE_TRANSITION_TIMEOUT_MS = 400;

export default function TableGrid({
  sections,
  getLink,
  getActions,
}: ITableGridProps) {
  return (
    <TransitionGroup>
      {Object.entries(sections).map(
        ([sectionName, sectionTables], sectionIndex) => {
          const sectionEnterTimeout = Math.min(
            (sectionIndex + 1) * 50,
            MAX_SECTION_TRANSITION_TIMEOUT_MS
          );

          const tableItems = sectionTables
            .map((table, tableIndex) => {
              if (!table) return null;

              const tableEnterTimeout = Math.min(
                sectionEnterTimeout + tableIndex * 25,
                MAX_TABLE_TRANSITION_TIMEOUT_MS
              );

              return (
                <SlideTransition
                  key={table.id}
                  appear
                  timeout={{ enter: tableEnterTimeout }}
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
            <Collapse key={sectionName}>
              <Box component="section" sx={{ mt: 4 }}>
                <SlideTransition
                  key={"grid-section-" + sectionName}
                  in
                  timeout={{ enter: sectionEnterTimeout }}
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
